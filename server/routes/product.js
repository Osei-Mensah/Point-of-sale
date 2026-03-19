const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all products
router.get("/", (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// ADD product
router.post("/", (req, res) => {
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

module.exports = router;
