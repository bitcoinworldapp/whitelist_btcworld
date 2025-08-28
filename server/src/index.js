// server/src/index.js  (ESM)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

const app = express();

// Opcional: limita CORS en prod con FRONT_ORIGIN, si no lo pones permite cualquiera.
const FRONT_ORIGIN = process.env.FRONT_ORIGIN;
app.use(
  cors({
    origin: FRONT_ORIGIN ? [FRONT_ORIGIN] : true,
    methods: ['GET', 'OPTIONS'],
  })
);
app.set('trust proxy', 1);
app.set('etag', false); // evita respuestas 304 por ETag

// ---- Parámetros de conexión a MongoDB (ajusta con tus VARS de Render)
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGO_DB || 'whitelist';     // <— DB: whitelist
const collName = process.env.MONGO_COLL || 'addresses'; // <— Coll: addresses

const client = new MongoClient(uri, { ignoreUndefined: true });
let col;

/** Normaliza direcciones:
 * - bech32/bech32m (bc1/tb1/bcrt1) -> minúsculas
 * - base58 (1... / 3...) -> tal cual (case-sensitive)
 * - elimina espacios y zero-width
 */
function normalizeAddress(input = '') {
  const s = String(input).trim().replace(/\u200B/g, '');
  if (!s) return '';
  if (/^(bc1|tb1|bcrt1)/i.test(s)) return s.toLowerCase();
  return s;
}

// Escapa texto para componer una RegExp segura
function escapeRegExp(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Healthcheck
app.get('/api/health', async (_req, res) => {
  try {
    await client.db(dbName).command({ ping: 1 });
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, db: dbName, coll: collName });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Endpoint principal: compatible con docs que solo tienen `address`
app.get('/api/check', async (req, res) => {
  try {
    if (!col) return res.status(503).json({ exists: false, error: 'db_not_ready' });

    const raw = typeof req.query.address === 'string' ? req.query.address : '';
    const norm = normalizeAddress(raw);
    if (!norm) return res.json({ exists: false });

    let query;
    if (/^(bc1|tb1|bcrt1)/i.test(raw)) {
      // bech32: busca por `normalized` o por `address` sin distinguir mayúsculas/minúsculas
      query = {
        $or: [
          { normalized: norm }, // por si ya migraste
          { address: { $regex: `^${escapeRegExp(norm)}$`, $options: 'i' } },
        ],
      };
    } else {
      // base58: comparación exacta (case-sensitive) o `normalized`
      query = {
        $or: [
          { normalized: norm }, // por si ya migraste
          { address: raw },
        ],
      };
    }

    const doc = await col.findOne(query);
    res.set('Cache-Control', 'no-store');
    res.json({ exists: !!doc });
  } catch (e) {
    console.error('CHECK_ERROR:', e);
    res.status(500).json({ exists: false, error: 'server_error' });
  }
});

// Conexión e inicio del servidor
(async () => {
  try {
    await client.connect();
    const db = client.db(dbName);
    col = db.collection(collName);

    // Índices (si existen, no pasa nada)
    col.createIndex({ normalized: 1 }).catch(() => {});
    col.createIndex({ address: 1 }).catch(() => {});

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[API] listening on ${PORT}`);
      console.log(`[Mongo] uri=${uri} db=${dbName} coll=${collName}`);
    });
  } catch (e) {
    console.error('MONGO_CONNECT_ERROR:', e);
    process.exit(1);
  }
})();
