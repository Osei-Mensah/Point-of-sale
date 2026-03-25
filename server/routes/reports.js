const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// GET daily report
router.get("/daily", verifyToken, isAdmin, (req, res) => {
  const query = `
  SELECT 
    COUNT(*) as total_sales,
    SUM(total_amount) as total_revenue,
    (
      SELECT SUM(quantity)
      FROM sales_items
      WHERE sale_id IN (
        SELECT id FROM sales WHERE DATE(created_at) = DATE('now')
      )
    ) as total_items_sold
  FROM sales
  WHERE DATE(created_at) = DATE('now')
`;
  db.get(query, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      totalSales: row.total_sales || 0,
      totalRevenue: row.total_revenue || 0,
      totalItemsSold: row.total_items_sold || 0,
    });
  });
});

module.exports = router;
