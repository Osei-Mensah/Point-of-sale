const express = require("express");
const router = express.Router();
const db = require("../db");
const XLSX = require("xlsx");

router.get("/sales", (req, res) => {
  const sql = `
    SELECT 
      sales.id as sale_id,
      sales.date,
      products.name as product_name,
      sales_items.quantity,
      sales_items.price,
      (sales_items.quantity * sales_items.price) as total
    FROM sales
    JOIN sales_items ON sales.id = sales_items.sale_id
    JOIN products ON products.id = sales_items.product_id
    ORDER BY sales.date DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Convert JSON → worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");

    // Generate buffer
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales_report.xlsx",
    );
    res.type(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.send(buffer);
  });
});

module.exports = router;
