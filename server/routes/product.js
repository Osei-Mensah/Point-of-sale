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

router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM products WHERE id = $1", [id]);

    res.json({
      message: "Product deleted",
    });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});
// GET all products
router.get("/", verifyToken, isCashierOrAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM products ORDER BY id ASC");

    res.json(result.rows);
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// ADD product
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, category, price, quantity } = req.body;
    const result = await db.query(
      `
     INSERT INTO products (name, category, price, quantity)
VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [name, category, price, quantity],
    );

    res.json({
      id: result.rows[0].id,
      message: "Product added successfully",
    });
  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});
// UPDATE product
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, quantity } = req.body;

    await db.query(
      `
      UPDATE products
      SET name = $1,
          category = $2,
          price = $3,
          quantity = $4
      WHERE id = $5
      `,
      [name, category, price, quantity, id],
    );

    res.json({
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
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

          // 🔴 VALIDATION
          if (!name || isNaN(price)) {
            errors.push({ row, error: "Invalid name or price" });
            skipped++;
            return insertNext(index + 1);
          }

          (async () => {
            try {
              // Insert product
              await db.query(
                `
      INSERT INTO products (
        name,
        category,
        price,
        quantity
        
      )
      VALUES ($1, $2, $3, $4)
      `,
                [name, category, price, quantity],
              );

              inserted++;
              insertNext(index + 1);
            } catch (err) {
              errors.push({
                row,
                error: err.message,
              });

              skipped++;
              insertNext(index + 1);
            }
          })();
        };

        insertNext(0);
      });
  },
);
module.exports = router;
