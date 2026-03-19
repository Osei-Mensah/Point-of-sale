const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Create database file in /database folder
const dbPath = path.join(__dirname, "../database/pos.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to SQLite database ✅");
  }
});

module.exports = db;
