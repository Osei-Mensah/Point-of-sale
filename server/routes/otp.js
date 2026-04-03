const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");
const { sendOTPEmail } = require("../services/emailService");

// 🔢 Generate OTP
router.post("/generate", verifyToken, async (req, res) => {
  const { customer_id } = req.body;

  if (!customer_id) {
    return res.status(400).json({ error: "Customer required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  db.run(
    `CREATE TABLE IF NOT EXISTS otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      code TEXT,
      expires_at INTEGER
    )`,
  );

  db.run(`INSERT INTO otps (customer_id, code, expires_at) VALUES (?, ?, ?)`, [
    customer_id,
    otp,
    expiresAt,
  ]);

  // 📧 Send email
  db.get(
    `SELECT email, name FROM customers WHERE id = ?`,
    [customer_id],
    async (err, customer) => {
      if (customer?.email) {
        await sendOTPEmail(customer.email, customer.name, otp);
      }
    },
  );

  res.json({ message: "OTP sent" });
});

// ✅ Verify OTP
router.post("/verify", verifyToken, (req, res) => {
  const { customer_id, otp } = req.body;

  db.get(
    `SELECT * FROM otps 
     WHERE customer_id = ? AND code = ?
     ORDER BY id DESC LIMIT 1`,
    [customer_id, otp],
    (err, row) => {
      if (!row) {
        return res.status(400).json({ error: "Invalid OTP" });
      }

      if (Date.now() > row.expires_at) {
        return res.status(400).json({ error: "OTP expired" });
      }

      res.json({ message: "OTP verified" });
    },
  );
});

module.exports = router;
