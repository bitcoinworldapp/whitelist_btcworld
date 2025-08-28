// Validación y normalización de direcciones BTC (ligera)
// - bech32/bech32m: bc1... (minúsculas)
// - base58: 1..., 3... (case-sensitive)
export function isValidBTCAddress(input) {
  if (!input || typeof input !== "string") return false;
  const addr = input.trim();

  const isBech32 = /^bc1[a-z0-9]{11,71}$/.test(addr) && addr === addr.toLowerCase();
  const isBase58 = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr);

  return isBech32 || isBase58;
}

export function normalizeAddress(input) {
  const a = input.trim();
  if (a.toLowerCase().startsWith("bc1")) return a.toLowerCase();
  return a; // base58 es case-sensitive
}
