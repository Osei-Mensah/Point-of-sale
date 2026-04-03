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
router.get("/", verifyToken, (req, res) => {
  const search = req.query.search || "";

  const query = `
  SELECT id, name, phone, email, points
  FROM customers
  WHERE (
    name LIKE ?
    OR phone LIKE ?
    OR email LIKE ?
  )
  ORDER BY created_at DESC
  LIMIT 20
`;

  const searchTerm = `%${search}%`;

  db.all(query, [searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
});

module.exports = router;
