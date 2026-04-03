process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

require("dotenv").config();
require("./db");
require("./initDB");
require("./migrations/add_customers_table");
require("./migrations/add_customer_id_to_sales");

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const { verifyToken, isAdmin } = require("./middleware/authMiddleware");
const customerRoutes = require("./routes/customers");

const productRoutes = require("./routes/product");
const app = express();
const salesRoutes = require("./routes/sales");
const exportRoutes = require("./routes/export");
const cookieParser = require("cookie-parser");
const reportRoutes = require("./routes/reports");
const paymentRoutes = require("./routes/payments");

app.use(
  cors({
    origin: "http://localhost:5173", // your frontend
    credentials: true, // VERY IMPORTANT
  }),
);
// ⚠️ RAW BODY for Paystack webhook ONLY
app.use((req, res, next) => {
  if (req.originalUrl === "/payments/webhook") {
    express.raw({ type: "*/*" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

app.use("/otp", require("./routes/otp"));
app.use("/export", exportRoutes);
app.use(cookieParser());
app.use("/auth", authRoutes);
app.use("/reports", reportRoutes);

app.get("/", (req, res) => {
  res.send("POS Backend Running 🚀");
});

// ADMIN ONLY
app.get("/admin-only", verifyToken, isAdmin, (req, res) => {
  res.json({ message: "Welcome Admin" });
});

app.use("/products", productRoutes);
app.use("/sales", salesRoutes);
app.use("/payments", paymentRoutes);
app.use("/customers", customerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.get("/protected", verifyToken, (req, res) => {
  res.json({
    message: "Access granted",
    user: req.user,
  });
});
