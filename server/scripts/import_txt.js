// server/scripts/import_txt.js
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";   // <- añadido
import { connectDB } from "../src/db.js";
import { WhitelistEntry } from "../src/models/WhitelistEntry.js";
import { isValidBTCAddress, normalizeAddress } from "../src/utils/btc.js";

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

// Ruta por defecto: server/data/addresses.txt (misma en todos los entornos)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.resolve(__dirname, "../data/addresses.txt");

const fileArg = getArg("file", DEFAULT_FILE);          // <- usa el default
const chunkArg = parseInt(getArg("chunk", "1000"), 10) || 1000;
const dryRun = process.argv.includes("--dry-run");

const filePath = path.resolve(process.cwd(), fileArg);
if (!fs.existsSync(filePath)) {
  console.error(`Archivo no encontrado: ${filePath}
Crea el fichero en: server/data/addresses.txt (una dirección por línea) o pasa --file=...`);
  process.exit(1);
}


async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("❌ MONGODB_URI no definido en .env");
      process.exit(1);
    }
    await connectDB(process.env.MONGODB_URI);

    const input = fs.createReadStream(filePath, { encoding: "utf8" });
    const rl = readline.createInterface({ input, crlfDelay: Infinity });

    let total = 0;
    let skippedEmpty = 0;
    let skippedComment = 0;
    let invalid = 0;
    let scheduled = 0;
    let insertedOrUpserted = 0;

    const seen = new Set();           // evita duplicados dentro del archivo
    let ops = [];

    const flush = async () => {
      if (!ops.length) return;
      if (dryRun) {
        scheduled += ops.length;
        ops = [];
        return;
      }
      const res = await WhitelistEntry.bulkWrite(ops, { ordered: false });
      insertedOrUpserted += (res.upsertedCount || 0);
      scheduled += ops.length;
      ops = [];
    };

    for await (const raw of rl) {
      total++;
      const line = raw.trim();

      if (!line) { skippedEmpty++; continue; }
      if (line.startsWith("#") || line.startsWith("//")) { skippedComment++; continue; }

      // El .txt debe tener UNA address por línea
      const address = line;
      if (!isValidBTCAddress(address)) { invalid++; continue; }

      const normalized = normalizeAddress(address);
      if (seen.has(normalized)) continue; // duplicado dentro del mismo .txt
      seen.add(normalized);

      // upsert por normalized; no sobre-escribe si ya existe
      ops.push({
        updateOne: {
          filter: { normalized },
          update: { $setOnInsert: { address, normalized } },
          upsert: true
        }
      });

      if (ops.length >= chunkArg) {
        await flush();
      }
    }

    await flush();

    console.log("=== Importación completada ===");
    console.log(`Archivo:        ${filePath}`);
    console.log(`Total líneas:   ${total}`);
    console.log(`Vacías:         ${skippedEmpty}`);
    console.log(`Comentarios:    ${skippedComment}`);
    console.log(`Inválidas:      ${invalid}`);
    console.log(`Programadas:    ${scheduled} operaciones`);
    if (dryRun) {
      console.log(`(dry-run) No se realizaron cambios en DB.`);
    } else {
      console.log(`Upserts nuevos: ${insertedOrUpserted}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error de importación:", err);
    process.exit(1);
  }
}

run();
