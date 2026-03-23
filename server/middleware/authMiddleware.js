const jwt = require("jsonwebtoken");

// VERIFY ACCESS TOKEN
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    req.user = decoded; // { id, role }

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// CHECK ADMIN ROLE
function isAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
  next();
}

// CHECK CASHIER OR ADMIN
function isCashierOrAdmin(req, res, next) {
  if (req.user.role !== "cashier" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied." });
  }
  next();
}

module.exports = { verifyToken, isAdmin, isCashierOrAdmin };
