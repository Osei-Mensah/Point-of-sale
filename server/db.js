const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error("❌ PostgreSQL connection error:", err.stack);
  }

  console.log("✅ Connected to Supabase PostgreSQL");

  release();
});

module.exports = pool;
