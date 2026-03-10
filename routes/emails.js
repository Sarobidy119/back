// ============================================================
// FICHIER : routes/emails.js
// RÔLE    : Envoi d'emails groupés (admin uniquement)
//           + historique des campagnes
// ============================================================
const express    = require("express");
const nodemailer = require("nodemailer");
const db         = require("../config/db");
const router     = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

// ── GET /api/emails/stats ─────────────────────────────────
router.get("/stats", (req, res) => {
  const q1 = "SELECT COUNT(*) as c FROM newsletter";
  const q2 = "SELECT COUNT(*) as c FROM users";
  const q3 = "SELECT COUNT(*) as total FROM email_campagnes";
  const q4 = "SELECT created_at FROM email_campagnes ORDER BY created_at DESC LIMIT 1";

  db.query(q1, (e1, r1) => {
    db.query(q2, (e2, r2) => {
      db.query(q3, (e3, r3) => {
        db.query(q4, (e4, r4) => {
          const derniere = r4?.[0]?.created_at
            ? new Date(r4[0].created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
            : "—";
          res.json({
            newsletter:     r1?.[0]?.c || 0,
            etudiants:      r2?.[0]?.c || 0,
            total_envoyes:  r3?.[0]?.total || 0,
            derniere,
          });
        });
      });
    });
  });
});

// ── GET /api/emails/historique ────────────────────────────
router.get("/historique", (req, res) => {
  db.query(
    "SELECT * FROM email_campagnes ORDER BY created_at DESC LIMIT 20",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ── POST /api/emails/envoyer ──────────────────────────────
router.post("/envoyer", async (req, res) => {
  const { destinataire, sujet, corps } = req.body;
  if (!destinataire || !sujet || !corps)
    return res.status(400).json({ error: "Champs manquants." });

  // Récupérer les destinataires selon le choix
  let sql, params = [];
  switch (destinataire) {
    case "newsletter":
      sql = "SELECT email, email as name FROM newsletter";
      break;
    case "etudiants":
      sql = "SELECT email, name FROM users";
      break;
    case "da2i":
      sql = "SELECT email, name FROM users WHERE mention = 'DA2I'";
      break;
    case "aes":
      sql = "SELECT email, name FROM users WHERE mention = 'AES'";
      break;
    case "icm":
      sql = "SELECT email, name FROM users WHERE mention = 'ICM'";
      break;
    default:
      return res.status(400).json({ error: "Destinataire invalide." });
  }

  db.query(sql, params, async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0)
      return res.status(404).json({ error: "Aucun destinataire trouvé." });

    let sent = 0;
    const errors = [];

    // Envoi en batch
    for (const row of rows) {
      const htmlCorps = corps
        .replace(/\n/g, "<br>")
        .replace(/\[(.+?)\]/g, '<strong style="color:#38bdf8">[$1]</strong>');

      const mail = {
        from: `"EMIT Radio" <${process.env.GMAIL_USER}>`,
        to: row.email,
        subject: sujet,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#fff;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:20px 24px;display:flex;align-items:center;gap:12px;">
              <span style="font-size:22px;">📻</span>
              <div>
                <p style="margin:0;font-weight:900;font-size:16px;">EMIT Radio</p>
                <p style="margin:0;font-size:11px;opacity:0.7;">La voix étudiante</p>
              </div>
            </div>
            <div style="padding:28px 24px;">
              ${row.name && row.name !== row.email ? `<p style="margin:0 0 16px;color:rgba(255,255,255,0.6);font-size:14px;">Bonjour <strong style="color:#fff">${row.name}</strong>,</p>` : ""}
              <div style="color:rgba(255,255,255,0.8);font-size:14px;line-height:1.7;">${htmlCorps}</div>
            </div>
            <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.1);text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.3);font-size:11px;">© EMIT Radio — Université de Fianarantsoa</p>
            </div>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mail);
        sent++;
      } catch (e) {
        errors.push(row.email);
      }

      // Petite pause pour éviter le spam
      await new Promise(r => setTimeout(r, 100));
    }

    // Sauvegarder dans l'historique
    db.query(
      "INSERT INTO email_campagnes (destinataire, sujet, corps, nb_envoyes) VALUES (?, ?, ?, ?)",
      [destinataire, sujet, corps, sent],
      () => {}
    );

    res.json({ success: true, count: sent, errors: errors.length });
  });
});

module.exports = router;
