const express = require("express");
const db = require("../config/db");
const router = express.Router();

// POST /api/newsletter — s'abonner
router.post("/", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email obligatoire." });
  }

  db.query(
    "INSERT INTO newsletter (email) VALUES (?)",
    [email],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ error: "Cet email est déjà abonné." });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json({ success: true, message: "Abonnement réussi !" });
    }
  );
});

// GET /api/newsletter — voir tous les abonnés (admin)
router.get("/", (req, res) => {
  db.query("SELECT * FROM newsletter ORDER BY created_at DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
