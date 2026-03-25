const express = require("express");
const {
  verifyToken,
  isAdmin,
  isCashierOrAdmin,
} = require("../middleware/authMiddleware");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

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

// GET products by barcode (handle duplicates)
router.get("/barcode/:barcode", verifyToken, isCashierOrAdmin, (req, res) => {
  const { barcode } = req.params;

  db.all(
    "SELECT * FROM products WHERE barcode = ?",
    [barcode],
    (err, products) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!products || products.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(products);
    },
  );
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

// BULK IMPORT PRODUCTS (CSV)
router.post(
  "/import",
  verifyToken,
  isAdmin,
  upload.single("file"),
  (req, res) => {
    const csv = require("csv-parser");
    const fs = require("fs");

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const results = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => {
        results.push(data);
      })
      .on("end", () => {
        let inserted = 0;
        let skipped = 0;

        const insertNext = (index) => {
          if (index >= results.length) {
            return res.json({
              message: "Import completed",
              total: results.length,
              inserted,
              skipped,
              errors,
            });
          }

          const row = results[index];

          const name = row.name?.trim();
          const category = row.category?.trim() || "";
          const price = Number(row.price);
          const quantity = Number(row.quantity) || 0;
          const barcode = row.barcode?.trim() || "";

          // 🔴 VALIDATION
          if (!name || isNaN(price)) {
            errors.push({ row, error: "Invalid name or price" });
            skipped++;
            return insertNext(index + 1);
          }

          // 🔴 CHECK DUPLICATE (barcode)
          db.get(
            "SELECT id FROM products WHERE barcode = ?",
            [barcode],
            (err, existing) => {
              if (err) {
                errors.push({ row, error: err.message });
                skipped++;
                return insertNext(index + 1);
              }

              if (existing) {
                skipped++;
                return insertNext(index + 1);
              }

              // ✅ INSERT
              db.run(
                `INSERT INTO products (name, category, price, quantity, barcode)
                 VALUES (?, ?, ?, ?, ?)`,
                [name, category, price, quantity, barcode],
                (err) => {
                  if (err) {
                    errors.push({ row, error: err.message });
                    skipped++;
                  } else {
                    inserted++;
                  }

                  insertNext(index + 1);
                },
              );
            },
          );
        };

        insertNext(0);
      });
  },
);
module.exports = router;
