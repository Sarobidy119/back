// ============================================================
// FICHIER : routes/evenements.js
// RÔLE    : CRUD événements spéciaux Radio EMIT
//           GET public — POST/PUT/DELETE admin
// ============================================================
const express = require("express");
const router  = express.Router();
const db      = require("../config/db");

// ── GET /api/evenements — PUBLIC ─────────────────────────────
// Retourne uniquement les événements publiés, à partir d'aujourd'hui
router.get("/", (req, res) => {
  db.query(
    `SELECT * FROM evenements_radio
     WHERE statut = 'publie' AND date >= CURDATE()
     ORDER BY date ASC, heure_debut ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ── GET /api/evenements/all — ADMIN (tous, y compris passés) ─
router.get("/all", (req, res) => {
  db.query(
    `SELECT * FROM evenements_radio ORDER BY date DESC, heure_debut DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ── POST /api/evenements — ADMIN ─────────────────────────────
router.post("/", (req, res) => {
  const { titre, description, date, heure_debut, heure_fin, animateur, categorie, statut } = req.body;
  if (!titre || !date || !heure_debut)
    return res.status(400).json({ error: "titre, date et heure_debut sont obligatoires." });

  db.query(
    `INSERT INTO evenements_radio (titre, description, date, heure_debut, heure_fin, animateur, categorie, statut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [titre, description || "", date, heure_debut, heure_fin || null, animateur || "", categorie || "evenement", statut || "publie"],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ success: true, id: result.insertId });
    }
  );
});

// ── PUT /api/evenements/:id — ADMIN ──────────────────────────
router.put("/:id", (req, res) => {
  const { titre, description, date, heure_debut, heure_fin, animateur, categorie, statut } = req.body;
  db.query(
    `UPDATE evenements_radio
     SET titre=?, description=?, date=?, heure_debut=?, heure_fin=?, animateur=?, categorie=?, statut=?, updated_at=NOW()
     WHERE id=?`,
    [titre, description || "", date, heure_debut, heure_fin || null, animateur || "", categorie || "evenement", statut || "publie", req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// ── DELETE /api/evenements/:id — ADMIN ───────────────────────
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM evenements_radio WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
