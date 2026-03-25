const db = require("../db");

db.serialize(() => {
  console.log("🚀 Adding amount_paid and change columns...");

  db.run(`ALTER TABLE sales ADD COLUMN amount_paid REAL`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Error adding amount_paid:", err.message);
    } else {
      console.log("✅ amount_paid ready");
    }
  });

  db.run(`ALTER TABLE sales ADD COLUMN change REAL`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Error adding change:", err.message);
    } else {
      console.log("✅ change ready");
    }
  });
});
