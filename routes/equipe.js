// ============================================================
// FICHIER : routes/equipe.js
// RÔLE    : CRUD membres équipe Radio EMIT
//           GET public — POST/PUT/DELETE admin
// ============================================================
const express = require("express");
const router  = express.Router();
const db      = require("../config/db");
const { requireAdmin } = require("../middleware/auth");

// ── GET /api/equipe ──────────────────────────────────────────
router.get("/", (req, res) => {
  db.query(
    "SELECT * FROM equipe ORDER BY categorie, ordre ASC, id ASC",
    (err, rows) => {
      if (err) { console.error("GET /equipe:", err); return res.status(500).json({ error: "Erreur serveur" }); }
      res.json(rows);
    }
  );
});

// ── POST /api/equipe ─────────────────────────────────────────
router.post("/", (req, res) => {
  const { nom, role, categorie, bio, bio_longue, photo, email, linkedin, twitter, emission, horaire, anciennete, specialite, ordre } = req.body;
  if (!nom || !role) return res.status(400).json({ error: "nom et role requis" });
  db.query(
    `INSERT INTO equipe (nom, role, categorie, bio, bio_longue, photo, email, linkedin, twitter, emission, horaire, anciennete, specialite, ordre)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nom, role, categorie || "Animation", bio || "", bio_longue || "", photo || "", email || "", linkedin || "", twitter || "", emission || "", horaire || "", anciennete || "", specialite || "", ordre || 0],
    (err, result) => {
      if (err) { console.error("POST /equipe:", err); return res.status(500).json({ error: "Erreur serveur" }); }
      res.status(201).json({ success: true, id: result.insertId });
    }
  );
});

// ── PUT /api/equipe/:id ──────────────────────────────────────
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { nom, role, categorie, bio, bio_longue, photo, email, linkedin, twitter, emission, horaire, anciennete, specialite, ordre } = req.body;
  if (!nom || !role) return res.status(400).json({ error: "nom et role requis" });
  db.query(
    `UPDATE equipe SET nom=?, role=?, categorie=?, bio=?, bio_longue=?, photo=?, email=?, linkedin=?, twitter=?, emission=?, horaire=?, anciennete=?, specialite=?, ordre=? WHERE id=?`,
    [nom, role, categorie, bio || "", bio_longue || "", photo || "", email || "", linkedin || "", twitter || "", emission || "", horaire || "", anciennete || "", specialite || "", ordre || 0, id],
    (err) => {
      if (err) { console.error("PUT /equipe:", err); return res.status(500).json({ error: "Erreur serveur" }); }
      res.json({ success: true });
    }
  );
});

// ── DELETE /api/equipe/:id ───────────────────────────────────
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM equipe WHERE id=?", [req.params.id], (err) => {
    if (err) { console.error("DELETE /equipe:", err); return res.status(500).json({ error: "Erreur serveur" }); }
    res.json({ success: true });
  });
});

module.exports = router;
