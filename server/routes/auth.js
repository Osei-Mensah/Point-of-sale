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
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 2. Find user
    const userResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    const user = userResult.rows[0];

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
      {
        id: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
      },
    );

    // 5. Generate Refresh Token
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
      },
    );

    // 6. Store Refresh Token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      `,
      [user.id, refreshToken, expiresAt.toISOString()],
    );

    // 7. Send cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    // 8. Send response
    res.json({
      message: "Login successful",
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// REFRESH ACCESS TOKEN
router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    // 1. Check token in DB
    const tokenResult = await db.query(
      "SELECT * FROM refresh_tokens WHERE token = $1",
      [token],
    );

    const storedToken = tokenResult.rows[0];

    if (!storedToken) {
      return res.status(403).json({
        error: "Invalid refresh token",
      });
    }

    // 2. Verify JWT
    jwt.verify(token, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          error: "Expired or invalid refresh token",
        });
      }

      // 3. Get user
      const userResult = await db.query(
        "SELECT role, email FROM users WHERE id = $1",
        [decoded.id],
      );

      const user = userResult.rows[0];

      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      // 4. Generate new access token
      const newAccessToken = jwt.sign(
        {
          id: decoded.id,
          role: user.role,
          email: user.email,
        },
        process.env.JWT_ACCESS_SECRET,
        {
          expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        },
      );

      res.json({
        accessToken: newAccessToken,
      });
    });
  } catch (error) {
    console.error("REFRESH TOKEN ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// LOGOUT USER
router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      await db.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});
module.exports = router;
