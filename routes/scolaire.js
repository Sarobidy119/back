// ============================================================
// FICHIER : routes/scolaire.js — routes protégées par JWT
// GET public, POST/DELETE admin, notifications user
// ============================================================
const express    = require("express");
const nodemailer = require("nodemailer");
const db         = require("../config/db");
const router     = express.Router();
const { requireUser, requireAdmin } = require("../middleware/auth");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

// ── Notifications helper ─────────────────────────────────────
async function envoyerNotifications(programme) {
  const { id, type, titre, date, heure, mention, niveau, parcours, lieu, session, salle, professeur } = programme;
  const messages = {
    cours:     `Nouveau cours : ${titre} — ${date} de ${heure} à ${programme.heure_fin || "?"} en salle ${salle || "?"}`,
    examen:    `Examen : ${titre} — ${date} à ${heure} (Session ${session || "normale"})`,
    evenement: `Événement : ${titre} — ${date} à ${heure} — Lieu : ${lieu || "à définir"}`,
    ag:        `Assemblée Générale — ${date} à ${heure} — Lieu : ${lieu || "à définir"}`,
  };
  const message = messages[type] || titre;

  let userQuery, userParams;
  if (type === "evenement" || type === "ag") {
    userQuery = "SELECT id, name, email FROM users";
    userParams = [];
  } else {
    userQuery = "SELECT id, name, email FROM users WHERE mention = ? AND niveau = ? AND parcours = ?";
    userParams = [mention, niveau, parcours];
  }

  db.query(userQuery, userParams, (err, users) => {
    if (err || !users.length) return;
    users.forEach(user => {
      db.query(
        "INSERT INTO notifications (programme_id, type, titre, message, mention, niveau, parcours, user_id) VALUES (?,?,?,?,?,?,?,?)",
        [id, type, titre, message, mention || null, niveau || null, parcours || null, user.id],
        () => {}
      );
      const mail = {
        from: `"EMIT Radio" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: `🔔 ${titre} — EMIT Radio`,
        html: `<div style="font-family:Arial;max-width:500px;margin:auto;background:#0f172a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0ea5e9,#2563eb);padding:20px;text-align:center;"><h2 style="margin:0;">📻 EMIT Radio</h2></div>
          <div style="padding:24px;"><p>Bonjour <strong>${user.name}</strong>,</p><p style="color:rgba(255,255,255,0.7);">${message}</p></div>
        </div>`,
      };
      transporter.sendMail(mail, () => {});
    });
  });
}

// ── GET /api/scolaire/stats-publiques — PUBLIC ───────────────
router.get("/stats-publiques", (req, res) => {
  const today   = new Date().toISOString().split("T")[0];
  const weekEnd = new Date(Date.now() + 7*24*60*60*1000).toISOString().split("T")[0];
  const queries = [
    { key: "etudiants",       sql: "SELECT COUNT(*) as c FROM users" },
    { key: "evenements",      sql: "SELECT COUNT(*) as c FROM programmes_scolaires WHERE type IN ('evenement','ag') AND date >= ?", params: [today] },
    { key: "cours_semaine",   sql: "SELECT COUNT(*) as c FROM programmes_scolaires WHERE type='cours' AND date BETWEEN ? AND ?", params: [today, weekEnd] },
    { key: "examens_a_venir", sql: "SELECT COUNT(*) as c FROM programmes_scolaires WHERE type='examen' AND date >= ?", params: [today] },
  ];
  const result = {}; let done = 0;
  queries.forEach(({ key, sql, params = [] }) => {
    db.query(sql, params, (err, rows) => {
      if (!err) result[key] = rows[0].c;
      if (++done === queries.length) res.json(result);
    });
  });
});

// ── GET /api/scolaire — PUBLIC ───────────────────────────────
router.get("/", (req, res) => {
  const { type, mention, niveau, parcours } = req.query;
  let sql = "SELECT * FROM programmes_scolaires WHERE 1=1";
  const params = [];
  if (type)     { sql += " AND type = ?";     params.push(type); }
  if (mention)  { sql += " AND mention = ?";  params.push(mention); }
  if (niveau)   { sql += " AND niveau = ?";   params.push(niveau); }
  if (parcours) { sql += " AND parcours = ?"; params.push(parcours); }
  sql += " ORDER BY date ASC, heure ASC";
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ── POST /api/scolaire — ADMIN UNIQUEMENT ────────────────────
router.post("/", async (req, res) => {
  const { type, titre, date, heure, mention, niveau, parcours, heure_fin, salle, professeur, session, lieu } = req.body;
  if (!type || !titre || !date || !heure)
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  db.query(
    "INSERT INTO programmes_scolaires (type,titre,date,heure,mention,niveau,parcours,heure_fin,salle,professeur,session,lieu) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id",
    [type, titre, date, heure, mention||null, niveau||null, parcours||null, heure_fin||null, salle||null, professeur||null, session||null, lieu||null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      envoyerNotifications({ id: result.insertId, ...req.body });
      res.status(201).json({ success: true, id: result.insertId });
    }
  );
});

// ── DELETE /api/scolaire/:id — ADMIN UNIQUEMENT ──────────────
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM programmes_scolaires WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ── Notifications — USER CONNECTÉ ────────────────────────────
router.get("/notifications/:userId", requireUser, (req, res) => {
  db.query(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30",
    [req.params.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.patch("/notifications/tout-lu/:userId", requireUser, (req, res) => {
  db.query("UPDATE notifications SET lu = 1 WHERE user_id = ?", [req.params.userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

router.patch("/notifications/:id/lu", requireUser, (req, res) => {
  db.query("UPDATE notifications SET lu = 1 WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
