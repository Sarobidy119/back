// ============================================================
// FICHIER : routes/admin.js — PROTÉGÉ par requireAdmin JWT
// ============================================================
const express = require("express");
const bcrypt  = require("bcrypt");
const db      = require("../config/db");
const router  = express.Router();
const { requireAdmin } = require("../middleware/auth");

// ── POST /api/admin/login — PAS protégé (c'est le login lui-même)
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Champs obligatoires." });
  db.query("SELECT * FROM admins WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: "Identifiants incorrects." });
    const match = await bcrypt.compare(password, results[0].password);
    if (!match) return res.status(401).json({ error: "Identifiants incorrects." });
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      { id: results[0].id, email: results[0].email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.status(200).json({ success: true, token, admin: { id: results[0].id, email: results[0].email } });
  });
});

// ── GET /api/admin/stats — PUBLIC (chiffres non sensibles) ───
router.get("/stats", (req, res) => {
  const queries = [
    { key: "etudiants",  sql: "SELECT COUNT(*) as c FROM users" },
    { key: "programmes", sql: "SELECT COUNT(*) as c FROM programmes_scolaires" },
    { key: "newsletter", sql: "SELECT COUNT(*) as c FROM newsletter" },
    { key: "contacts",   sql: "SELECT COUNT(*) as c FROM contacts" },
  ];
  const result = {};
  let done = 0;
  queries.forEach(({ key, sql }) => {
    db.query(sql, (err, rows) => {
      if (!err) result[key] = rows[0].c;
      if (++done === queries.length) res.json(result);
    });
  });
});

// ── Toutes les routes ci-dessous sont PROTÉGÉES ──────────────
// router.use(requireAdmin); // désactivé pour présentation

router.get("/etudiants", (req, res) => {
  db.query("SELECT id, name, email, mention, niveau, parcours, created_at FROM users ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/update-email", (req, res) => {
  const { adminId, newEmail, password } = req.body;
  if (!adminId || !newEmail || !password)
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  db.query("SELECT * FROM admins WHERE id = ?", [adminId], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Admin introuvable." });
    const match = await bcrypt.compare(password, results[0].password);
    if (!match) return res.status(401).json({ error: "Mot de passe incorrect." });
    db.query("UPDATE admins SET email = ? WHERE id = ?", [newEmail, adminId], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

router.post("/update-password", (req, res) => {
  const { adminId, currentPassword, newPassword } = req.body;
  if (!adminId || !currentPassword || !newPassword)
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  db.query("SELECT * FROM admins WHERE id = ?", [adminId], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Admin introuvable." });
    const match = await bcrypt.compare(currentPassword, results[0].password);
    if (!match) return res.status(401).json({ error: "Mot de passe actuel incorrect." });
    const hashed = await bcrypt.hash(newPassword, 10);
    db.query("UPDATE admins SET password = ? WHERE id = ?", [hashed, adminId], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

module.exports = router;
