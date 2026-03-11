const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const contactRoute    = require("./routes/contact");
const newsletterRoute = require("./routes/newsletter");
const authRoute       = require("./routes/auth");
const adminRoute      = require("./routes/admin");
const scolaireRoute   = require("./routes/scolaire");
const emailsRoute     = require("./routes/emails");
const equipeRoute     = require("./routes/equipe");
const evenementsRoute = require("./routes/evenements"); // ← NOUVEAU

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (like curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.options("*", cors());
app.use(express.json());

app.use("/api/contact",     contactRoute);
app.use("/api/newsletter",  newsletterRoute);
app.use("/api/auth",        authRoute);
app.use("/api/admin",       adminRoute);
app.use("/api/scolaire",    scolaireRoute);
app.use("/api/emails",      emailsRoute);
app.use("/api/equipe",      equipeRoute);
app.use("/api/evenements",  evenementsRoute); // ← NOUVEAU

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Serveur lancé sur http://localhost:${PORT}`));
