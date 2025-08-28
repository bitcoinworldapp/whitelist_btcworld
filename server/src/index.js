// server/src/index.js (ESM)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

const app = express();

// CORS (ajusta FRONT_ORIGIN en prod si quieres restringir)
const FRONT = process.env.FRONT_ORIGIN;
app.use(
  cors({
    origin: FRONT ? [FRONT] : true,
    methods: ['GET'],
  })
);
app.set('trust proxy', 1);

// ---- Conexión Mongo (usa .env)
// Un único cliente puede acceder a varias DB dentro del mismo cluster
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';

// Lista 1 (whitelist)
const dbWL   = process.env.MONGO_DB   || 'whitelist';
const collWL = process.env.MONGO_COLL || 'addresses';

// Lista 2 (goodtoday)
const dbGT   = process.env.MONGO_DB_GT   || 'goodtoday';
const collGT = process.env.MONGO_COLL_GT || 'addresses';

const client = new MongoClient(uri, { ignoreUndefined: true });

let colWhitelist; // whitelist.addresses
let colGoodToday; // goodtoday.addresses

// Normaliza: Bech32 a minúsculas; Base58 tal cual
function normalizeAddress(input = '') {
  const s = String(input).trim().replace(/\u200B/g, '');
  if (!s) return '';
  if (/^(bc1|tb1|bcrt1)/i.test(s)) return s.toLowerCase();
  return s; // base58 es case-sensitive
}

// Construye query robusta (soporta address, address_lc y normalized)
function buildQuery(a) {
  const isBech32 = /^(bc1|tb1|bcrt1)/i.test(a);
  if (isBech32) {
    return {
      $or: [
        { normalized: a },            // si existe el campo
        { address: a },               // guardada en minúsculas
        { address_lc: a },            // algunas cargas guardaron address_lc
      ],
    };
  }
  // Base58 (case-sensitive): buscamos exacto en address y también normalized
  return {
    $or: [
      { address: a },
      { normalized: a },
    ],
  };
}

// Healthcheck
app.get('/api/health', async (_req, res) => {
  try {
    await client.db(dbWL).command({ ping: 1 });
    await client.db(dbGT).command({ ping: 1 });
    res.json({ ok: true, dbs: [dbWL, dbGT] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Check: devuelve dónde está la address
// { exists: boolean, foundIn: 'whitelist' | 'goodtoday' | 'both' | null }
app.get('/api/check', async (req, res) => {
  try {
    if (!colWhitelist || !colGoodToday) {
      return res.status(503).json({ exists: false, error: 'db_not_ready' });
    }

    const raw = String(req.query.address || '');
    const a = normalizeAddress(raw);
    if (!a) return res.json({ exists: false, foundIn: null });

    const q = buildQuery(a);
    const [hitWL, hitGT] = await Promise.all([
      colWhitelist.findOne(q),
      colGoodToday.findOne(q),
    ]);

    let foundIn = null;
    if (hitWL && hitGT) foundIn = 'both';
    else if (hitWL) foundIn = 'whitelist';
    else if (hitGT) foundIn = 'goodtoday';

    res.json({ exists: !!foundIn, foundIn });
  } catch (e) {
    console.error('CHECK_ERROR:', e);
    res.status(500).json({ exists: false, error: 'server_error' });
  }
});

// Arranque tras conectar a Mongo
(async () => {
  try {
    await client.connect();

    const db1 = client.db(dbWL);
    const db2 = client.db(dbGT);

    colWhitelist = db1.collection(collWL);
    colGoodToday = db2.collection(collGT);

    // índices (si ya existen no pasa nada)
    colWhitelist.createIndex({ normalized: 1 }).catch(() => {});
    colWhitelist.createIndex({ address: 1 }).catch(() => {});
    colWhitelist.createIndex({ address_lc: 1 }).catch(() => {});

    colGoodToday.createIndex({ normalized: 1 }).catch(() => {});
    colGoodToday.createIndex({ address: 1 }).catch(() => {});
    colGoodToday.createIndex({ address_lc: 1 }).catch(() => {});

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log('API ready on', PORT);
      console.log('Mongo:', uri);
      console.log(`WL -> ${dbWL}.${collWL}`);
      console.log(`GT -> ${dbGT}.${collGT}`);
    });
  } catch (e) {
    console.error('MONGO_CONNECT_ERROR:', e);
    process.exit(1);
  }
})();
