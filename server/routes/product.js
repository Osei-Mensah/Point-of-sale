const express = require("express");
const {
  verifyToken,
  isAdmin,
  isCashierOrAdmin,
} = require("../middleware/authMiddleware");
const router = express.Router();
const db = require("../db");

router.delete("/:id", verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: "Product deleted" });
  });
});
// GET all products
router.get("/", verifyToken, isCashierOrAdmin, async (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// ADD product
router.post("/", verifyToken, isAdmin, (req, res) => {
  const { name, category, price, quantity, barcode } = req.body;

  const sql = `
    INSERT INTO products (name, category, price, quantity, barcode)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(sql, [name, category, price, quantity, barcode], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      id: this.lastID,
      message: "Product added successfully",
    });
  });
});
// UPDATE product
router.put("/:id", verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { name, category, price, quantity, barcode } = req.body;

  const sql = `
    UPDATE products
    SET name = ?, category = ?, price = ?, quantity = ?, barcode = ?
    WHERE id = ?
  `;

  db.run(sql, [name, category, price, quantity, barcode, id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: "Product updated successfully" });
  });
});
module.exports = router;
