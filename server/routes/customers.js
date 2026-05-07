const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");

// ➕ CREATE CUSTOMER
router.post("/", verifyToken, (req, res) => {
  const { name, phone, email } = req.body;
  const userId = req.user.id;

  // 🔐 Validation
  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Customer name is required" });
  }

  if (!phone && !email) {
    return res.status(400).json({
      error: "Phone or email is required to avoid duplicates",
    });
  }

  // 🔍 Check if customer already exists
  db.get(
    `SELECT id FROM customers 
 WHERE (phone = ? AND ? IS NOT NULL)
    OR (email = ? AND ? IS NOT NULL)`,
    [phone, phone, email, email],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // ✅ If customer exists, reuse instead of creating duplicate
      if (existing) {
        return res.status(200).json({
          message: "Customer already exists",
          customerId: existing.id,
        });
      }

      // ➕ CREATE NEW CUSTOMER (only if not found)
      db.run(
        `
      INSERT INTO customers (user_id, name, phone, email)
      VALUES (?, ?, ?, ?)
      `,
        [userId, name.trim(), phone || null, email || null],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          return res.status(201).json({
            message: "Customer created successfully",
            customerId: this.lastID,
          });
        },
      );
    },
  );
});

// 🔍 SEARCH CUSTOMERS
router.get("/", verifyToken, async (req, res) => {
  try {
    const search = req.query.search || "";
    const searchTerm = `%${search}%`;

    const result = await db.query(
      `
      SELECT id, name, phone, email, points
      FROM customers
      WHERE (
        name ILIKE $1
        OR phone ILIKE $1
        OR email ILIKE $1
      )
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [searchTerm],
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("CUSTOMER SEARCH ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});
module.exports = router;
