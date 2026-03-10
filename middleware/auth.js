// ============================================================
// FICHIER : middleware/auth.js
// ============================================================
const jwt = require("jsonwebtoken");

function requireUser(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ error: "Non autorisé — token manquant." });
  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré." });
  }
}

// Admin : accepte n'importe quel token JWT valide
function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ error: "Non autorisé — token manquant." });
  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré." });
  }
}

module.exports = { requireUser, requireAdmin };
