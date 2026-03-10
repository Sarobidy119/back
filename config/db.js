const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "radio_emit",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Erreur connexion MySQL:", err.message);
    return;
  }
  console.log("✅ Connecté à MySQL - radio_emit");
});

module.exports = db;
