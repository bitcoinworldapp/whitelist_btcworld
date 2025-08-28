import 'dotenv/config';
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGO_DB || 'ordinals_whitelist';
const collName = process.env.MONGO_COLL || 'whitelists';

// ruta addresses.txt relativa a este script: ../data/addresses.txt
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultTxt = path.resolve(__dirname, '../data/addresses.txt');
const fileArg = process.argv.find(a => a.startsWith('--file='))?.split('=')[1];
const filePath = fileArg || defaultTxt;

function normalizeAddress(input = '') {
  const s = String(input).trim().replace(/\u200B/g, '');
  if (!s) return '';
  // bech32/bech32m a minúsculas:
  if (/^(bc1|tb1|bcrt1)/i.test(s)) return s.toLowerCase();
  // base58 es case-sensitive
  return s;
}

function readAddresses(p) {
  const raw = fs.readFileSync(p, 'utf8');
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const set = new Set(lines); // dedup por línea exacta
  return Array.from(set);
}

const client = new MongoClient(uri, { ignoreUndefined: true });

try {
  console.log(`[Seed] leyendo "${filePath}"…`);
  const lines = readAddresses(filePath);
  console.log(`[Seed] ${lines.length} líneas (únicas)`);

  const docs = lines.map(a => {
    const norm = normalizeAddress(a);
    return {
      address: a,
      normalized: norm,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  await client.connect();
  const col = client.db(dbName).collection(collName);

  // índices útiles
  await col.createIndex({ normalized: 1 });
  await col.createIndex({ address: 1 });

  // upsert por normalized (si no hay bech32, normalized==address)
  const ops = docs.map(d => ({
    updateOne: {
      filter: { normalized: d.normalized },
      update: { $set: d },
      upsert: true,
    },
  }));

  const res = await col.bulkWrite(ops, { ordered: false });
  const upserts = res.upsertedCount || 0;
  const modified = res.modifiedCount || 0;

  console.log(`[Seed] upserts: ${upserts} | modified: ${modified}`);
  const total = await col.countDocuments();
  console.log(`[Seed] total en ${dbName}.${collName}: ${total}`);
} catch (e) {
  console.error('[Seed] ERROR:', e);
  process.exitCode = 1;
} finally {
  await client.close();
}
