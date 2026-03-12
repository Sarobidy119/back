const { Pool } = require("pg");

const useSsl = process.env.DB_SSL === "true";
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "radio_emit",
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });

function buildQuery(sql, params) {
  if (!params || params.length === 0) return { text: sql, values: [] };
  let i = 0;
  const text = sql.replace(/\?/g, () => `$${++i}`);
  return { text, values: params };
}

function query(sql, params, cb) {
  if (typeof params === "function") {
    cb = params;
    params = [];
  }
  const { text, values } = buildQuery(sql, params);
  const isSelect = /^\s*select\b/i.test(text);

  pool.query(text, values)
    .then((res) => {
      if (isSelect) return cb(null, res.rows);
      const result = { rowCount: res.rowCount, rows: res.rows };
      if (res.rows && res.rows[0] && typeof res.rows[0].id !== "undefined") {
        result.insertId = res.rows[0].id;
      }
      return cb(null, result);
    })
    .catch((err) => cb(err));
}

// Test initial connection
pool.query("SELECT 1")
  .then(() => console.log("✅ Connecté à PostgreSQL"))
  .catch((err) => console.error("❌ Erreur connexion PostgreSQL:", err.message));

module.exports = { query };
