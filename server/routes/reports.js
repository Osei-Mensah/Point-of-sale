const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// GET daily report
router.get("/daily", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) AS total_sales,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        (
          SELECT COALESCE(SUM(quantity), 0)
          FROM sales_items
          WHERE sale_id IN (
            SELECT id
            FROM sales
            WHERE DATE(created_at) = CURRENT_DATE
          )
        ) AS total_items_sold
      FROM sales
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    const row = result.rows[0];

    res.json({
      totalSales: Number(row.total_sales) || 0,
      totalRevenue: Number(row.total_revenue) || 0,
      totalItemsSold: Number(row.total_items_sold) || 0,
    });
  } catch (error) {
    console.error("DAILY REPORT ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;
