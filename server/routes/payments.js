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
    const points_used = metadata?.points_used || 0;
    const customer_id = metadata?.customer_id || null;
    const cart = metadata?.cart;

    if (!cart || cart.length === 0) {
      return res.status(400).json({
        error: "Cart data missing in payment metadata",
      });
    }

    // 🔐 STEP 10 — Recalculate total from DB (ANTI-FRAUD)
    let calculatedTotal = 0;

    function validateCartAndCalculateTotal(callback) {
      let i = 0;

      function next() {
        if (i >= cart.length) {
          return callback();
        }

        const item = cart[i];

        db.get(
          `SELECT price FROM products WHERE id = ?`,
          [item.id],
          (err, row) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            if (!row) {
              return res.status(400).json({
                error: `Product not found (ID: ${item.id})`,
              });
            }

            calculatedTotal += row.price * item.quantity;

            i++;
            next();
          },
        );
      }

      next();
    }

    const paymentMethod = "paystack";

    validateCartAndCalculateTotal(() => {
      // 🎯 APPLY POINTS DISCOUNT
      let discount = 0;
      let finalTotal = calculatedTotal;

      if (
        customer_id !== null &&
        customer_id !== undefined &&
        points_used > 0
      ) {
        discount = Math.floor(points_used / 10);
        finalTotal = calculatedTotal - discount;

        if (finalTotal < 0) finalTotal = 0;
      }

      // 🔐 FIRST — fraud check (MOVED HERE)
      if (
        Number(calculatedTotal.toFixed(2)) !== Number(amountPaid.toFixed(2))
      ) {
        return res.status(400).json({
          error: "Payment amount mismatch. Possible tampering detected.",
        });
      }

      // 🎯 THEN points validation
      if (
        customer_id !== null &&
        customer_id !== undefined &&
        points_used > 0
      ) {
        db.get(
          `SELECT points FROM customers WHERE id = ?`,
          [customer_id],
          (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            if (!row) {
              return res.status(400).json({ error: "Customer not found" });
            }

            if (points_used > row.points) {
              return res.status(400).json({ error: "Not enough points" });
            }

            proceedWithPayment();
          },
        );
      } else {
        proceedWithPayment();
      }

      function proceedWithPayment() {
        db.serialize(() => {
          db.run("BEGIN TRANSACTION");

          db.run(
            `INSERT OR IGNORE INTO sales (
  total_amount, payment_method, user_id, amount_paid, change, created_at, reference, customer_id
)
VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)`,
            [
              finalTotal,
              paymentMethod,
              userId,
              amountPaid,
              amountPaid - finalTotal, // ✅ FIXED
              reference,
              customer_id,
            ],
            function (err) {
              if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
              }

              if (this.changes === 0) {
                return db.get(
                  `SELECT id FROM sales WHERE reference = ?`,
                  [reference],
                  (err, row) => {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }

                    return res.json({
                      message: "Already processed",
                      saleId: row.id,
                      reference,
                    });
                  },
                );
              }

              const saleId = this.lastID;
              const stmt = db.prepare(`
        INSERT INTO sales_items (sale_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `);

              let index = 0;

              function processNextItem() {
                if (index >= cart.length) {
                  stmt.finalize();

                  db.run("COMMIT", (err) => {
                    if (err) {
                      if (err.message.includes("no transaction is active")) {
                        console.warn(
                          "⚠️ Commit skipped (no active transaction)",
                        );

                        // 📧 Send receipt email (use CUSTOMER from DB)
                        if (customer_id !== null && customer_id !== undefined) {
                          db.get(
                            `SELECT email, name FROM customers WHERE id = ?`,
                            [customer_id],
                            (err, customer) => {
                              if (!err && customer?.email) {
                                const {
                                  sendReceiptEmail,
                                } = require("../services/emailService");

                                sendReceiptEmail({
                                  email: customer.email,
                                  customerName: customer.name || "Customer",
                                  total: finalTotal,
                                  pointsUsed: points_used,
                                  pointsEarned: Math.floor(finalTotal),
                                  items: cart,
                                }).catch(console.error);
                              }
                            },
                          );
                        }
                        return res.json({
                          message: "Payment verified (already committed)",
                          saleId,
                          reference,
                        });
                      }

                      db.run("ROLLBACK");
                      return res.status(500).json({ error: err.message });
                    }

                    const {
                      sendReceiptEmail,
                    } = require("../services/emailService");

                    // 📧 Send receipt email (MAIN SUCCESS PATH)
                    if (customer_id !== null && customer_id !== undefined) {
                      db.get(
                        `SELECT email, name FROM customers WHERE id = ?`,
                        [customer_id],
                        (err, customer) => {
                          if (!err && customer?.email) {
                            sendReceiptEmail({
                              email: customer.email,
                              customerName: customer.name || "Customer",
                              total: finalTotal,
                              pointsUsed: points_used,
                              pointsEarned: Math.floor(finalTotal),
                              items: cart,
                            }).catch(console.error);
                          }
                        },
                      );
                    }

                    return res.json({
                      message: "Payment verified and sale recorded",
                      saleId,
                      reference,
                    });
                  });

                  if (customer_id !== null && customer_id !== undefined) {
                    db.run(
                      `UPDATE customers SET points = points + ? WHERE id = ?`,
                      [Math.floor(finalTotal), customer_id],
                    );

                    if (points_used > 0) {
                      db.run(
                        `UPDATE customers SET points = points - ? WHERE id = ? AND points >= ?`,
                        [points_used, customer_id, points_used],
                      );
                    }
                  }
                  return;
                }

                const item = cart[index];

                db.run(
                  `UPDATE products 
           SET quantity = quantity - ? 
           WHERE id = ? AND quantity >= ?`,
                  [item.quantity, item.id, item.quantity],
                  function (err) {
                    if (err) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ error: err.message });
                    }

                    if (this.changes === 0) {
                      db.run("ROLLBACK");
                      return res.status(400).json({
                        error: `Insufficient stock for product ID ${item.id}`,
                      });
                    }

                    stmt.run(
                      saleId,
                      item.id,
                      item.quantity,
                      item.price,
                      (err) => {
                        if (err) {
                          db.run("ROLLBACK");
                          return res.status(500).json({ error: err.message });
                        }

                        index++;
                        processNextItem();
                      },
                    );
                  },
                );
              }

              processNextItem();
            },
          );
        });
      }
    });
  }
  processPayment();
}

router.post("/initialize", async (req, res) => {
  try {
    const { email, amount, cart, customer_id, points_used } = req.body;
    if (!email || amount === undefined || !cart) {
      return res.status(400).json({
        error: "Email, amount, and cart are required",
      });
    }

    // 🔐 Generate unique reference (VERY IMPORTANT)
    const reference = `POS_${Date.now()}`;
    // 🔴 Convert to kobo (Paystack uses smallest currency unit)
    const amountInKobo = Math.round(amount * 100);

    // 🔐 Call Paystack API
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amountInKobo,
        currency: "GHS",
        reference: reference,
        callback_url: "http://localhost:5173/sales",
        metadata: {
          cart,
          customer_id,
          points_used,
        },
      },
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
