const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  verifyToken,
  isCashierOrAdmin,
} = require("../middleware/authMiddleware");

router.post("/", verifyToken, isCashierOrAdmin, async (req, res) => {
  const { cart, total, paymentMethod } = req.body;
  const userId = req.user.id;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.run(
      `INSERT INTO sales (total_amount, payment_method, user_id, created_at)
   VALUES (?, ?, ?, datetime('now'))`,
      [total, paymentMethod, userId],
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
});

// GET all sales
router.get("/", verifyToken, isCashierOrAdmin, (req, res) => {
  const query = `
  SELECT id, total_amount, payment_method, user_id, created_at
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

  const query = `
    SELECT 
      si.id,
      si.product_id,
      p.name,
      si.quantity,
      si.price
    FROM sales_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

module.exports = router;
