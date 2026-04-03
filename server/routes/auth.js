const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db");
const jwt = require("jsonwebtoken");

// REGISTER USER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // 2. Check if user already exists
    db.get(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (user) {
          return res.status(400).json({ error: "User already exists" });
        }

        // 3. Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Insert user
        db.run(
          `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
          [name, email, hashedPassword, role || "cashier"],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            return res.status(201).json({
              message: "User registered successfully",
              userId: this.lastID,
            });
          },
        );
      },
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LOGIN USER
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // 1. Validate input
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // 2. Find user
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // 4. Generate Access Token
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
    );

    // 5. Generate Refresh Token
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
    );

    // 6. Store Refresh Token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    db.run(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
      [user.id, refreshToken, expiresAt.toISOString()],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // 7. Send Refresh Token as HTTP-only cookie
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: false, // change to true in production (HTTPS)
          sameSite: "strict",
        });

        // 8. Send Access Token
        res.json({
          message: "Login successful",
          accessToken,
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
          },
        });
      },
    );
  });
});

// REFRESH ACCESS TOKEN
router.post("/refresh", (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  // 1. Check if token exists in DB
  db.get(
    "SELECT * FROM refresh_tokens WHERE token = ?",
    [token],
    (err, storedToken) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!storedToken) {
        return res.status(403).json({ error: "Invalid refresh token" });
      }

      // 2. Verify token
      jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
        if (err) {
          return res
            .status(403)
            .json({ error: "Expired or invalid refresh token" });
        }

        // 3. Generate new access token
        // 🔥 First get user from DB
        db.get(
          "SELECT role, email FROM users WHERE id = ?",
          [decoded.id],
          (err, user) => {
            if (err || !user) {
              return res.status(500).json({ error: "User not found" });
            }

            const newAccessToken = jwt.sign(
              {
                id: decoded.id,
                role: user.role,
                email: user.email,
              },
              process.env.JWT_ACCESS_SECRET,
              { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
            );

            res.json({ accessToken: newAccessToken });
          },
        );
      });
    },
  );
});

// LOGOUT USER
router.post("/logout", (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(400).json({ error: "No refresh token provided" });
  }

  // 1. Delete token from DB
  db.run("DELETE FROM refresh_tokens WHERE token = ?", [token], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // 2. Clear cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false, // set true in production
      sameSite: "strict",
    });

    return res.json({ message: "Logged out successfully" });
  });
});
module.exports = router;
