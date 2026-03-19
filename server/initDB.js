const db = require("./db");

db.run(
  `
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    quantity INTEGER DEFAULT 0,
    barcode TEXT
  )
`,
  (err) => {
    if (err) {
      console.error("Error creating table:", err.message);
    } else {
      console.log("Products table ready ✅");
    }
  },
);
