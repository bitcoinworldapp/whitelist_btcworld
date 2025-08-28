// El proxy de Vite redirige /api al backend (http://localhost:4000)
export async function checkWhitelist(address) {
  const params = new URLSearchParams({ address });
  const res = await fetch(`/api/check?${params.toString()}`, {
    method: "GET",
    headers: { "Accept": "application/json" }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Error checking address");
  }
  return data; // { input, normalized, whitelisted }
}
