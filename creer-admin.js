// ============================================================
// FICHIER : creer-admin.js
// RÔLE    : Script à exécuter UNE SEULE FOIS pour créer le
//           compte administrateur dans la base de données
//
// UTILISATION :
//   node creer-admin.js
//
// Ce script :
//   1. Hache le mot de passe de façon sécurisée (bcrypt)
//   2. Insère le compte admin dans la table "admins"
//   3. Affiche une confirmation
// ============================================================

const bcrypt = require("bcrypt");
const db = require("./config/db");

// ── IDENTIFIANTS DU COMPTE ADMIN ─────────────────────────────
// Modifiez ces valeurs avant d'exécuter le script !
const ADMIN_EMAIL    = "admin@radioemit.fr";
const ADMIN_PASSWORD = "Admin@2025";

async function creerAdmin() {
  console.log("🔧 Création du compte administrateur...\n");

  // Hachage sécurisé du mot de passe (10 tours de sel)
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Insertion dans la table admins
  db.query(
    "INSERT INTO admins (email, password) VALUES (?, ?) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password",
    [ADMIN_EMAIL, hashedPassword],
    (err) => {
      if (err) {
        console.error("❌ Erreur :", err.message);
        process.exit(1);
      }

      console.log("✅ Compte admin créé avec succès !\n");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📧 Email    : ${ADMIN_EMAIL}`);
      console.log(`🔑 Password : ${ADMIN_PASSWORD}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("\n🌐 Connectez-vous sur : http://localhost:5173/login");
      console.log("   Vous serez redirigé automatiquement vers /admin/dashboard\n");

      process.exit(0);
    }
  );
}

creerAdmin();
