// server/src/index.js (ESM)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

const app = express();
app.use(cors({ origin: true })); // ajustaremos CORS en prod
app.set('trust proxy', 1);

// ---- Conexión Mongo (usa .env)
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ordinals_whitelist';
const dbName = process.env.MONGO_DB || 'ordinals_whitelist';
const collName = process.env.MONGO_COLL || 'whitelists';

const client = new MongoClient(uri, { ignoreUndefined: true });
let col;

// Normaliza: Bech32 a minúsculas; Base58 tal cual
function normalizeAddress(input = '') {
  const s = String(input).trim().replace(/\u200B/g, '');
  if (!s) return '';
  if (/^(bc1|tb1|bcrt1)/i.test(s)) return s.toLowerCase();
  return s; // base58 es case-sensitive
}

// Healthcheck
app.get('/api/health', async (_req, res) => {
  try {
    await client.db(dbName).command({ ping: 1 });
    res.json({ ok: true, db: dbName });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Check por `normalized`
app.get('/api/check', async (req, res) => {
  try {
    if (!col) return res.status(503).json({ exists: false, error: 'db_not_ready' });
    const a = normalizeAddress(req.query.address || '');
    if (!a) return res.json({ exists: false });

    const doc = await col.findOne({ normalized: a });
    res.json({ exists: !!doc });
  } catch (e) {
    console.error('CHECK_ERROR:', e);
    res.status(500).json({ exists: false, error: 'server_error' });
  }
});

// Conexión e índices
(async () => {
  try {
    await client.connect();
    const db = client.db(dbName);
    col = db.collection(collName);

    // índice por normalized
    await col.createIndex({ normalized: 1 });

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log('API ready on', PORT);
      console.log('Mongo:', uri, dbName, collName);
    });
  } catch (e) {
    console.error('MONGO_CONNECT_ERROR:', e);
    process.exit(1);
  }
})();
