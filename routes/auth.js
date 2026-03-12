// ============================================================
// FICHIER : routes/auth.js
// RÔLE    : Routes d'authentification du backend
//           Gère l'inscription et la connexion des utilisateurs
//           Utilise bcrypt pour sécuriser les mots de passe
// ============================================================

const express = require("express");
const bcrypt = require("bcrypt");       // Librairie de hachage de mot de passe
const jwt    = require("jsonwebtoken");  // Token JWT
const db = require("../config/db");    // Connexion à la base de données MySQL
const router = express.Router();

// ── ROUTE : INSCRIPTION ───────────────────────────────────────
// POST /api/auth/register
// Reçoit : { name, email, password }
// Retourne : { success, user } ou { error }
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }

  try {
    // ── VÉRIFICATION : l'email ne doit pas être celui d'un admin ──
    // Empêche qu'un étudiant s'inscrive avec le même email que l'admin
    db.query("SELECT id FROM admins WHERE email = ?", [email], async (err, adminResults) => {
      if (err) return res.status(500).json({ error: err.message });

      if (adminResults.length > 0) {
        // Email déjà utilisé par un compte admin → refus
        return res.status(409).json({ error: "Cet email n'est pas disponible." });
      }

      // Email libre → on peut créer le compte étudiant
      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, email, hashedPassword],
        (err, result) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") {
              return res.status(409).json({ error: "Cet email est déjà utilisé." });
            }
            return res.status(500).json({ error: err.message });
          }
          const user = { id: result.insertId, name, email };
          res.status(201).json({ success: true, user });
        }
      );
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ROUTE : CONNEXION UNIVERSELLE ────────────────────────────
// POST /api/auth/login
// Reçoit : { email, password }
// Logique :
//   1. Vérifie d'abord dans la table "admins"
//      → Si trouvé et mdp correct → retourne { role: "admin" }
//   2. Sinon vérifie dans la table "users"
//      → Si trouvé et mdp correct → retourne { role: "user" }
//   3. Sinon → erreur 401
// Le frontend redirige selon le rôle reçu
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("🔍 Tentative login:", email);

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe obligatoires." });
  }

  // ── ÉTAPE 1 : Cherche dans la table admins ────────────────
  db.query("SELECT * FROM admins WHERE email = ?", [email], async (err, adminResults) => {
    if (err) return res.status(500).json({ error: err.message });

    console.log("👤 Admins trouvés:", adminResults.length);

    if (adminResults.length > 0) {
      const match = await bcrypt.compare(password, adminResults[0].password);
      console.log("🔑 Match admin:", match);
      if (match) {
        const adminToken = jwt.sign(
          { id: adminResults[0].id, email: adminResults[0].email, role: "admin" },
          process.env.JWT_SECRET,
          { expiresIn: "8h" }
        );
        return res.status(200).json({
          success: true,
          role: "admin",
          token: adminToken,
          admin: { id: adminResults[0].id, email: adminResults[0].email }
        });
      }
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    // ── ÉTAPE 2 : Cherche dans la table users ─────────────────
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, userResults) => {
      if (err) return res.status(500).json({ error: err.message });

      console.log("👥 Users trouvés:", userResults.length);

      if (userResults.length === 0) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect." });
      }

      console.log("🔐 Hash en base:", userResults[0].password?.substring(0, 20) + "...");

      const match = await bcrypt.compare(password, userResults[0].password);
      console.log("🔑 Match user:", match);

      if (!match) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect." });
      }

      const user = { id: userResults[0].id, name: userResults[0].name, email: userResults[0].email };
      res.status(200).json({ success: true, role: "user", user });
    });
  });
});

module.exports = router;

// ── ROUTE : MOT DE PASSE OUBLIÉ ───────────────────────────────
// POST /api/auth/forgot-password
// Reçoit : { email }
// Génère un token unique, l'enregistre en base et envoie un email
const nodemailer = require("nodemailer");
const crypto = require("crypto"); // Module natif Node.js pour générer des tokens

// Configuration email (même que contact.js)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email obligatoire." });
  }

  // Vérifie si l'email existe dans la base
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Sécurité : on répond toujours "succès" même si email inexistant
    // pour ne pas révéler quels emails sont enregistrés
    if (results.length === 0) {
      return res.status(200).json({ success: true });
    }

    const user = results[0];

    // Génération d'un code à 6 chiffres
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // Expiration dans 1 heure
    const expiresAt = new Date(Date.now() + 3600000);

    // Sauvegarde du token en base de données
    db.query(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)",
      [user.id, token, expiresAt],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Code de réinitialisation envoyé par email
        const mail = {
          from: process.env.GMAIL_USER,
          to: email,
          subject: "🔑 Code de réinitialisation — EMIT Radio",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; background: #0f172a; padding: 32px; border-radius: 16px;">
              <h2 style="color: #0ea5e9; margin-bottom: 8px;">Réinitialisation de mot de passe</h2>
              <p style="color: #cbd5e1;">Bonjour <strong style="color: white;">${user.name}</strong>,</p>
              <p style="color: #cbd5e1;">Voici votre code de réinitialisation de mot de passe. Il est valable <strong style="color: white;">1 heure</strong>.</p>
              <div style="margin: 28px 0; text-align: center;">
                <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #2563eb); padding: 20px 40px; border-radius: 12px;">
                  <p style="margin: 0; font-size: 36px; font-weight: 900; color: white; letter-spacing: 10px;">${token}</p>
                </div>
              </div>
              <p style="color: #94a3b8; font-size: 13px;">Entrez ce code sur la page de réinitialisation.</p>
              <p style="color: #64748b; font-size: 12px;">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
            </div>
          `,
        };

        transporter.sendMail(mail, (err) => {
          if (err) console.error("⚠️ Erreur envoi email reset:", err.message);
        });

        res.status(200).json({ success: true });
      }
    );
  });
});

// ── ROUTE : RÉINITIALISER LE MOT DE PASSE ────────────────────
// POST /api/auth/reset-password
// Reçoit : { token, password }
// Vérifie le token et met à jour le mot de passe
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token et mot de passe obligatoires." });
  }

  // Vérifie que le token existe et n'est pas expiré
  db.query(
    "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()",
    [token],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(400).json({ error: "Lien invalide ou expiré." });
      }

      const userId = results[0].user_id;

      // Hachage du nouveau mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Mise à jour du mot de passe dans la table users
      db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, userId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // Suppression du token utilisé (ne peut pas être réutilisé)
          db.query("DELETE FROM password_resets WHERE token = ?", [token]);

          res.status(200).json({ success: true, message: "Mot de passe mis à jour." });
        }
      );
    }
  );
});
