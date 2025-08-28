// server/src/index.js (ESM)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

const app = express();

// CORS abierto (ajústalo si quieres restringir a tu dominio del front)
app.use(cors({ origin: true }));
app.set('trust proxy', 1);

// ---------- Configuración Mongo por ENV ----------
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGO_DB || 'whitelist';

// OJO: aquí definimos las dos colecciones
// - MONGO_COLL_WHITELIST: colección de la whitelist principal (p. ej. "addresses")
// - MONGO_COLL_GOODTODAY: colección de la lista GoodToday (p. ej. "goodtoday")
const collWhitelistName = process.env.MONGO_COLL_WHITELIST || process.env.MONGO_COLL || 'addresses';
const collGoodtodayName = process.env.MONGO_COLL_GOODTODAY || 'goodtoday';

const client = new MongoClient(uri, { ignoreUndefined: true });
let colWhitelist, colGoodtoday;

// Normaliza: Bech32 minúsculas; Base58 tal cual; quita zero-width
function normalizeAddress(input = '') {
  const s = String(input).trim().replace(/\u200B/g, '');
  if (!s) return '';
  if (/^(bc1|tb1|bcrt1)/i.test(s)) return s.toLowerCase();
  return s;
}

// Healthcheck
app.get('/api/health', async (_req, res) => {
  try {
    await client.db(dbName).command({ ping: 1 });
    res.json({
      ok: true,
      db: dbName,
      collections: {
        whitelist: collWhitelistName,
        goodtoday: collGoodtodayName,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Endpoint que mira en AMBAS colecciones y dice dónde está
app.get('/api/check', async (req, res) => {
  try {
    if (!colWhitelist || !colGoodtoday) {
      return res.status(503).json({ exists: false, error: 'db_not_ready' });
    }

    const a = normalizeAddress(req.query.address || '');
    if (!a) return res.json({ exists: false, foundIn: null });

    // buscamos por normalized o por address (por si tus docs aún no tienen "normalized")
    const query = { $or: [{ normalized: a }, { address: a }] };

    const [hitW, hitG] = await Promise.all([
      colWhitelist.findOne(query),
      colGoodtoday.findOne(query),
    ]);

    let foundIn = null;
    if (hitW && hitG) foundIn = 'both';
    else if (hitW) foundIn = 'whitelist';
    else if (hitG) foundIn = 'goodtoday';

    res.json({ exists: !!foundIn, foundIn });
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

    colWhitelist = db.collection(collWhitelistName);
    colGoodtoday = db.collection(collGoodtodayName);

    // índices (si ya existen no pasa nada)
    await Promise.all([
      colWhitelist.createIndex({ normalized: 1 }),
      colWhitelist.createIndex({ address: 1 }),
      colGoodtoday.createIndex({ normalized: 1 }),
      colGoodtoday.createIndex({ address: 1 }),
    ]);

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log('API ready on', PORT);
      console.log('Mongo URI:', uri);
      console.log('DB:', dbName);
      console.log('Collections:', { whitelist: collWhitelistName, goodtoday: collGoodtodayName });
    });
  } catch (e) {
    console.error('MONGO_CONNECT_ERROR:', e);
    process.exit(1);
  }
})();
