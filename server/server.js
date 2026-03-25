require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const { verifyToken, isAdmin } = require("./middleware/authMiddleware");

const productRoutes = require("./routes/product");
const app = express();
const salesRoutes = require("./routes/sales");
const exportRoutes = require("./routes/export");
const cookieParser = require("cookie-parser");
const reportRoutes = require("./routes/reports");

app.use(
  cors({
    origin: "http://localhost:5173", // your frontend
    credentials: true, // VERY IMPORTANT
  }),
);
app.use(express.json());
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
