// API base URL - sempre usa a mesma origem para evitar problemas de porta/SSL.
// No ambiente local o Vite já faz proxy de /api para o backend.
const API_BASE_URL = `${window.location.origin}/api`;

export function apiHeaders() {
  const t = localStorage.getItem('fps_token'); // padronizamos fps_token
  return t ? { Authorization: 'Bearer ' + t } : {};
}

export async function apiGet(path) {
  const headers = { 'Content-Type': 'application/json', ...apiHeaders() };
  const res = await fetch(`${API_BASE_URL}/${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    try { throw new Error(JSON.parse(text).message || text); } catch { throw new Error(text || `${res.status} ${res.statusText}`); }
  }
  return res.json();
}
 
export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE_URL}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...apiHeaders() },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    try { throw new Error(JSON.parse(text).message || text); } catch { throw new Error(text || `${res.status} ${res.statusText}`); }
  }
  return res.json();
}
