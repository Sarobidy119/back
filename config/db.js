const mysql = require("mysql2");

// Use a pool to avoid "connection closed" errors on long-running apps.
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "radio_emit",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test initial connection (non-blocking).
db.getConnection((err, conn) => {
  if (err) {
    console.error("? Erreur connexion MySQL:", err.message);
    return;
  }
  console.log("? Connecté à MySQL - radio_emit");
  conn.release();
});

module.exports = db;
