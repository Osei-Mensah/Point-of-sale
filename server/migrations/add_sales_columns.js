const db = require("../db");

db.serialize(() => {
  console.log("🚀 Running migration: add payment_method + user_id");

  db.run(`ALTER TABLE sales ADD COLUMN payment_method TEXT`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Error adding payment_method:", err.message);
    } else {
      console.log("✅ payment_method column ready");
    }
  });

  db.run(`ALTER TABLE sales ADD COLUMN user_id INTEGER`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Error adding user_id:", err.message);
    } else {
      console.log("✅ user_id column ready");
    }
  });
});
