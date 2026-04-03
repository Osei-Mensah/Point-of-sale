const db = require("../db");

// 🔍 Check if column already exists (prevent crash)
db.all(`PRAGMA table_info(sales)`, (err, columns) => {
  if (err) {
    console.error("❌ Failed to inspect sales table:", err.message);
    return;
  }

  const columnExists = columns.some((col) => col.name === "customer_id");

  if (columnExists) {
    console.log("ℹ️ customer_id already exists in sales table");
    return;
  }

  // ✅ Add column safely
  db.run(`ALTER TABLE sales ADD COLUMN customer_id INTEGER`, (err) => {
    if (err) {
      console.error("❌ Failed to add customer_id:", err.message);
    } else {
      console.log("✅ customer_id column added to sales table");
    }
  });
});
