const mysql = require("mysql2");

// Use environment variables when deployed (Render), fallback to local defaults.
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "radio_emit",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Erreur connexion MySQL:", err.message);
    return;
  }
  console.log("✅ Connecté à MySQL - radio_emit");
});

module.exports = db;
