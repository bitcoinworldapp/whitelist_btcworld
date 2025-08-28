// client/src/lib/api.js
const RAW_BASE = import.meta.env?.VITE_API_BASE || '';       // '' en dev (Vite proxy)
const API_BASE = RAW_BASE.replace(/\/+$/, '');               // quita barra final

export async function checkWhitelist(address) {
  const url = `${API_BASE}/api/check?address=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store', // ayuda a evitar respuestas 304
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error checking address');
  return data; // { exists: boolean }
}
