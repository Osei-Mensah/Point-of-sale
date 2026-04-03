const express = require("express");
const router = express.Router();
const db = require("../db");
const { sendReceiptEmail } = require("../services/emailService");
const {
  verifyToken,
  isCashierOrAdmin,
} = require("../middleware/authMiddleware");

router.post("/", verifyToken, isCashierOrAdmin, async (req, res) => {
  const { cart, total, paymentMethod, amountPaid, customer_id, points_used } =
    req.body;

  // 🎯 POINTS LOGIC
  let discount = 0;
  let finalTotal = total;

  if (customer_id !== null && customer_id !== undefined && points_used > 0) {
    discount = Math.floor(points_used / 10); // 10 pts = 1 GHS
    finalTotal = total - discount;

    if (finalTotal < 0) finalTotal = 0;
  }
  const change = amountPaid - finalTotal;
  const userId = req.user.id;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  if (customer_id !== null && customer_id !== undefined && points_used > 0) {
    db.get(
      `SELECT points FROM customers WHERE id = ?`,
      [customer_id],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!row) {
          return res.status(400).json({ error: "Customer not found" });
        }

        if (points_used > row.points) {
          return res.status(400).json({ error: "Not enough points" });
        }

        // ✅ Continue transaction ONLY after validation passes
        proceedWithTransaction();
      },
    );
  } else {
    proceedWithTransaction();
  }

  function proceedWithTransaction() {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      db.run(
        `INSERT INTO sales (total_amount, payment_method, user_id, amount_paid, change, created_at, customer_id)
VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`,
        [
          finalTotal,
          paymentMethod,
          userId,
          amountPaid,
          change,
          customer_id || null,
        ],
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
              // ✅ All items processed → finalize + commit
              stmt.finalize();

              db.run("COMMIT", (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ error: err.message });
                }

                if (customer_id !== null && customer_id !== undefined) {
                  // ➕ Add earned points
                  db.run(
                    `UPDATE customers SET points = points + ? WHERE id = ?`,
                    [Math.floor(finalTotal), customer_id],
                  );

                  if (points_used) {
                    db.run(
                      `UPDATE customers SET points = points - ? WHERE id = ? AND points >= ?`,
                      [points_used, customer_id, points_used],
                    );
                  }
                }
                // 📧 Send receipt email (for cash payments)
                if (customer_id) {
                  db.get(
                    `SELECT email, name FROM customers WHERE id = ?`,
                    [customer_id],
                    (err, customer) => {
                      if (!err && customer?.email) {
                        sendReceiptEmail({
                          email: customer.email,
                          customerName: customer.name || "Customer",
                          total: finalTotal,
                          pointsUsed: points_used || 0,
                          pointsEarned: Math.floor(finalTotal),
                        }).catch(console.error);
                      }
                    },
                  );
                }

                sendReceiptEmail({
                  email: "kwesidarkomichael@gmail.com", // put YOUR email here
                  customerName: "Test User",
                  total: finalTotal,
                  pointsUsed: points_used || 0,
                  pointsEarned: Math.floor(finalTotal),
                }).catch(console.error);

                return res.json({
                  message: "Sale completed successfully ✅",
                  saleId: saleId,
                });
              });

              return;
            }

            const item = cart[index];

            // 🔍 1. Check stock
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

                // ✅ 2. Insert item
                stmt.run(saleId, item.id, item.quantity, item.price, (err) => {
                  if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                  }

                  // ✅ 3. Update stock
                  db.run(
                    `UPDATE products SET quantity = quantity - ? WHERE id = ?`,
                    [item.quantity, item.id],
                    (err) => {
                      if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                      }

                      // 👉 Move to next item ONLY after success
                      index++;
                      processNextItem();
                    },
                  );
                });
              },
            );
          }

          // 🚀 Start processing
          processNextItem();
        },
      );
    });
  }
});

// GET all sales
router.get("/", verifyToken, isCashierOrAdmin, (req, res) => {
  const query = `
  SELECT id, total_amount, payment_method, user_id, amount_paid, change, created_at
  FROM sales
  ORDER BY created_at DESC
`;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

// GET single sale with items
router.get("/:id", verifyToken, isCashierOrAdmin, (req, res) => {
  const { id } = req.params;

  // 🔹 Get sale info first
  db.get(`SELECT * FROM sales WHERE id = ?`, [id], (err, sale) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // 🔹 Then get items
    db.all(
      `
        SELECT 
          si.product_id,
          p.name,
          si.quantity,
          si.price
        FROM sales_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
        `,
      [id],
      (err, items) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // 🔥 RETURN COMBINED DATA
        return res.json({
          ...sale,
          items,
        });
      },
    );
  });
});

module.exports = router;
