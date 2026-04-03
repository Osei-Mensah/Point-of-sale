const db = require("../db");

db.run(
  `
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,

    points INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`,
  (err) => {
    if (err) {
      console.error("❌ Error creating customers table:", err.message);
    } else {
      console.log("✅ Customers table ready");
    }
  },
);

// 🔍 Indexes for fast search
db.run(
  `CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id)`,
);
db.run(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`);
