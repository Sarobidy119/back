// ============================================================
// FICHIER : cleaner.js
// RÔLE    : Suppression automatique des événements passés
//           Tourne toutes les heures en arrière-plan
//           Un événement est "passé" si sa date+heure est < maintenant
// ============================================================
const db = require("./config/db");

function supprimerEvenementsPassés() {
  // On combine date (ex: "2025-03-08") et heure (ex: "14:30")
  // en un DATETIME comparable avec NOW()
  // On garde une marge de 1h après l'heure de fin pour laisser le temps de finir
  const sql = `
    DELETE FROM programmes_scolaires
    WHERE CONCAT(date, ' ', COALESCE(heure_fin, heure)) < DATE_SUB(NOW(), INTERVAL 1 HOUR)
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Cleaner — Erreur suppression:", err.message);
      return;
    }
    if (result.affectedRows > 0) {
      console.log(`🧹 Cleaner — ${result.affectedRows} événement(s) passé(s) supprimé(s) à ${new Date().toLocaleString("fr-FR")}`);
    }
  });
}

function démarrerCleaner() {
  console.log("🧹 Cleaner automatique démarré — vérification toutes les heures");

  // Première vérification immédiate au démarrage
  supprimerEvenementsPassés();

  // Puis toutes les heures (3 600 000 ms)
  setInterval(supprimerEvenementsPassés, 60 * 60 * 1000);
}

module.exports = { démarrerCleaner };
