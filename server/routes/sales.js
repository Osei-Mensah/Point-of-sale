const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  verifyToken,
  isCashierOrAdmin,
} = require("../middleware/authMiddleware");

router.post("/", verifyToken, isCashierOrAdmin, async (req, res) => {
  const { cart, total } = req.body;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  // 1. Insert into sales table
  db.run(
    `INSERT INTO sales (total_amount) VALUES (?)`,
    [total],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const saleId = this.lastID;

      // 2. Insert each cart item
      const stmt = db.prepare(`
        INSERT INTO sales_items (sale_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `);

      cart.forEach((item) => {
        stmt.run(saleId, item.id, item.quantity, item.price);

        // 3. Reduce inventory
        db.run(`UPDATE products SET quantity = quantity - ? WHERE id = ?`, [
          item.quantity,
          item.id,
        ]);
      });

      stmt.finalize();

      res.json({ message: "Sale completed successfully ✅" });
    },
  );
});

module.exports = router;
