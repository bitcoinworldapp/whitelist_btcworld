import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ordinals_whitelist';
const dbName = process.env.MONGO_DB || 'ordinals_whitelist';
const collName = process.env.MONGO_COLL || 'whitelists';

function normalizeAddress(input = '') {
  const s = String(input).trim().replace(/\u200B/g, '');
  if (!s) return '';
  if (/^(bc1|tb1|bcrt1)/i.test(s)) return s.toLowerCase();
  return s;
}

const client = new MongoClient(uri);

(async () => {
  await client.connect();
  const col = client.db(dbName).collection(collName);

  const cursor = col.find({ $or: [{ normalized: { $exists: false } }, { normalized: '' }] });
  let n = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const raw = doc.address || '';
    const norm = normalizeAddress(raw);
    await col.updateOne({ _id: doc._id }, { $set: { normalized: norm } });
    n++;
  }
  console.log(`Backfill done: ${n} docs actualizados`);
  await client.close();
  process.exit(0);
})();
