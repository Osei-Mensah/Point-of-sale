const db = require("../db");
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

// POST /payments/initialize
const axios = require("axios");

function handleSuccessfulPayment(paymentData, reference, userId, res) {
  function processPayment() {
    const amountPaid = paymentData.amount / 100; // convert from kobo
    const email = paymentData.customer?.email;

    if (!email) {
      return res.status(400).json({
        error: "Invalid payment data: missing customer email",
      });
    }

    const metadata = paymentData.metadata;

    const cart = metadata?.cart;

    if (!cart || cart.length === 0) {
      return res.status(400).json({
        error: "Cart data missing in payment metadata",
      });
    }

    // 🔐 STEP 10 — Recalculate total from DB (ANTI-FRAUD)
    let calculatedTotal = 0;

    async function validateCartAndCalculateTotal() {
      calculatedTotal = 0;

      for (const item of cart) {
        const result = await db.query(
          "SELECT price FROM products WHERE id = $1",
          [item.id],
        );

        const row = result.rows[0];

        if (!row) {
          throw new Error(`Product not found (ID: ${item.id})`);
        }

        calculatedTotal += Number(row.price) * item.quantity;
      }
    }

    const paymentMethod = "paystack";

    (async () => {
      try {
        await validateCartAndCalculateTotal(); // 🎯 APPLY POINTS DISCOUNT
        const finalTotal = calculatedTotal;

        // 🔐 FIRST — fraud check (MOVED HERE)
        if (
          Number(calculatedTotal.toFixed(2)) !== Number(amountPaid.toFixed(2))
        ) {
          return res.status(400).json({
            error: "Payment amount mismatch. Possible tampering detected.",
          });
        }

        proceedWithPayment();

        async function proceedWithPayment() {
          const client = await db.connect();

          try {
            await client.query("BEGIN");

            // Prevent duplicate processing
            const existingSaleResult = await client.query(
              "SELECT id FROM sales WHERE reference = $1",
              [reference],
            );

            if (existingSaleResult.rows.length > 0) {
              await client.query("ROLLBACK");

              return res.json({
                message: "Already processed",
                saleId: existingSaleResult.rows[0].id,
                reference,
              });
            }

            // Create sale
            const saleResult = await client.query(
              `
      INSERT INTO sales (
        total_amount,
        payment_method,
        user_id,
        amount_paid,
        change,
        created_at,
        reference
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING id
      `,
              [
                finalTotal,
                paymentMethod,
                userId,
                amountPaid,
                amountPaid - finalTotal,
                reference,
              ],
            );

            const saleId = saleResult.rows[0].id;

            // Process cart items
            for (const item of cart) {
              // Reduce stock safely
              const updateResult = await client.query(
                `
        UPDATE products
        SET quantity = quantity - $1
        WHERE id = $2
          AND quantity >= $1
        RETURNING id
        `,
                [item.quantity, item.id],
              );

              if (updateResult.rows.length === 0) {
                throw new Error(`Insufficient stock for product ID ${item.id}`);
              }

              // Insert sale item
              await client.query(
                `
        INSERT INTO sales_items (
          sale_id,
          product_id,
          quantity,
          price
        )
        VALUES ($1, $2, $3, $4)
        `,
                [saleId, item.id, item.quantity, item.price],
              );
            }

            await client.query("COMMIT");

            return res.json({
              message: "Payment verified and sale recorded",
              saleId,
              reference,
            });
          } catch (error) {
            await client.query("ROLLBACK");

            return res.status(500).json({
              error: error.message,
            });
          } finally {
            client.release();
          }
        }
      } catch (error) {
        return res.status(500).json({
          error: error.message,
        });
      }
    })();
  }
  processPayment();
}

router.post("/initialize", async (req, res) => {
  try {
    const { email, amount, cart } = req.body;
    if (!email || amount === undefined || !cart) {
      return res.status(400).json({
        error: "Email, amount, and cart are required",
      });
    }

    // 🔐 Generate unique reference (VERY IMPORTANT)
    const reference = `POS_${Date.now()}`;
    // 🔴 Convert to kobo (Paystack uses smallest currency unit)
    const amountInKobo = Math.round(amount * 100);

    const { phone, provider } = req.body;

    const isMobileMoney = phone && provider;

    const payload = {
      email,
      amount: amountInKobo,
      currency: "GHS",
      reference: reference,
      callback_url: process.env.FRONTEND_URL + "/sales",
      metadata: {
        cart,
      },
    };

    if (isMobileMoney) {
      payload.channels = ["mobile_money"];
      payload.mobile_money = {
        phone,
        provider,
      };
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    // ✅ Send authorization URL back to frontend
    return res.json({
      authorization_url: response.data.data.authorization_url,
      reference: reference,
    });
  } catch (error) {
    console.error(
      "Paystack initialization error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      error: "Failed to initialize payment",
    });
  }
});

// POST /payments/verify
router.post("/verify", verifyToken, async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        error: "Reference is required",
      });
    }

    // 🔐 Verify transaction with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const paymentData = response.data.data;
    if (paymentData.status !== "success") {
      return res.status(400).json({
        error: "Payment not successful",
      });
    }
    // ✅ Handle successful payment
    handleSuccessfulPayment(paymentData, reference, req.user.id, res);
  } catch (error) {
    console.error(
      "Paystack verification error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      error: "Failed to verify payment",
    });
  }
});

router.post("/webhook", (req, res) => {
  try {
    const crypto = require("crypto");

    const secret = process.env.PAYSTACK_SECRET_KEY;

    // 🔐 Verify Paystack signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.body)
      .digest("hex");

    const signature = req.headers["x-paystack-signature"];
    if (hash !== signature) {
      return res.status(401).send("Invalid signature");
    }

    // ✅ NOW safely parse JSON
    const event = JSON.parse(req.body.toString());

    // 🔒 ENABLE THIS BACK IN PRODUCTION
    // if (hash !== signature) {
    //   return res.status(401).send("Invalid signature");
    // }

    // ✅ Handle successful payment
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      console.log("Webhook received for:", reference);
      // ❌ DO NOT WRITE TO DB HERE
      return res.sendStatus(200);
    }

    // ✅ VERY IMPORTANT: Always respond
    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    return res.sendStatus(500);
  }
});
module.exports = router;
