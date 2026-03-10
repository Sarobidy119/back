const express = require("express");
const nodemailer = require("nodemailer");
const db = require("../config/db");
const router = express.Router();

// POST /api/contact
router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }

  try {
    // 1. Sauvegarder dans MySQL
    db.query(
      "INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)",
      [name, email, message],
      (err) => {
        if (err) console.error("Erreur MySQL:", err);
        else console.log("✅ Message sauvegardé dans la base de données");
      }
    );

    // 2. Envoyer les emails
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    // Email reçu par Radio EMIT
    await transporter.sendMail({
      from: `"Radio EMIT Contact" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `📩 Nouveau message de ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #135bec; border-bottom: 2px solid #135bec; padding-bottom: 10px;">
            Nouveau message - Radio EMIT
          </h2>
          <p><strong>Nom :</strong> ${name}</p>
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Message :</strong></p>
          <div style="background: #f6f6f8; padding: 15px; border-radius: 8px;">
            ${message}
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            Envoyé depuis le formulaire de contact de Radio EMIT
          </p>
        </div>
      `,
    });

    // Email de confirmation à l'utilisateur
    await transporter.sendMail({
      from: `"Radio EMIT" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "✅ Votre message a bien été reçu - Radio EMIT",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #135bec;">Merci ${name} !</h2>
          <p>Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.</p>
          <div style="background: #f6f6f8; padding: 15px; border-radius: 8px;">
            <p><strong>Votre message :</strong></p>
            <p>${message}</p>
          </div>
          <p style="margin-top: 20px;">— L'équipe Radio EMIT</p>
        </div>
      `,
    });

    res.status(200).json({ success: true, message: "Message envoyé avec succès !" });

  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi du message." });
  }
});

// GET /api/contact — voir tous les messages
router.get("/", (req, res) => {
  db.query("SELECT * FROM contacts ORDER BY created_at DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
