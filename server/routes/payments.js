const db = require("../db");
const express = require("express");
const router = express.Router();

// POST /payments/initialize
const axios = require("axios");

router.post("/initialize", async (req, res) => {
  try {
    const { email, amount, cart } = req.body;
    // ⚠️ Basic validation
    if (!email || !amount || !cart) {
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
        metadata: {
          cart,
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
router.post("/verify", async (req, res) => {
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

    // 🚨 جلوگیری از duplicate verification (VERY IMPORTANT)
    db.get(
      `SELECT id FROM sales WHERE reference = ?`,
      [reference],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (row) {
          return res.status(400).json({
            error: "This payment has already been processed",
          });
        }

        // 👉 Continue with normal flow AFTER this check
        proceedWithSale(paymentData, reference);
      },
    );

    function proceedWithSale(paymentData, reference) {
      const amountPaid = paymentData.amount / 100; // convert from kobo
      const email = paymentData.customer.email;
      const metadata = paymentData.metadata;

      // ⚠️ For now, just return success
      // 🔥 Next step: we will create sale here

      // Extract cart from metadata
      const cart = metadata?.cart;

      if (!cart || cart.length === 0) {
        return res.status(400).json({
          error: "Cart data missing in payment metadata",
        });
      }

      // ⚠️ For now: no user_id (we can improve later)
      const paymentMethod = "paystack";

      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.run(
          `INSERT INTO sales (total_amount, payment_method, user_id, amount_paid, change, created_at, reference)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          [amountPaid, paymentMethod, null, amountPaid, 0, reference],
          function (err) {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: err.message });
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
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                  }

                  return res.json({
                    message: "Payment verified & sale recorded ✅",
                    saleId,
                    reference,
                  });
                });

                return;
              }

              const item = cart[index];

              // 🔍 Check stock
              db.get(
                `SELECT quantity FROM products WHERE id = ?`,
                [item.id],
                (err, row) => {
                  if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                  }

                  if (!row || row.quantity < item.quantity) {
                    db.run("ROLLBACK");
                    return res.status(400).json({
                      error: `Insufficient stock for product ID ${item.id}`,
                    });
                  }

                  // ✅ Insert item
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

                      // ✅ Deduct stock
                      db.run(
                        `UPDATE products SET quantity = quantity - ? WHERE id = ?`,
                        [item.quantity, item.id],
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
                },
              );
            }

            processNextItem();
          },
        );
      });
    }
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

module.exports = router;
