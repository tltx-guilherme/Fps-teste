// Client-side auth utilities (no Node.js dependencies)

export function setToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fps_token', token);
  }
}

export function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('fps_token');
  }
  return null;
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fps_token');
  }
}

// Decode JWT payload without using jsonwebtoken (client-safe)
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isAuthed() {
  const token = getToken();
  if (!token) return false;

  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return false;
    // Check if the token has expired
    if (payload.exp) {
      return payload.exp * 1000 > Date.now();
    }
    return true;
  } catch {
    return false;
  }
}

export function isAdmin() {
  const token = getToken();
  if (!token) return false;

  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return false;
    const adminIds =
      (typeof window !== 'undefined' ? window.__ADMIN_USER_IDS__ : []) || [];
    const userId = payload.sub || payload.userId;

    if (!userId) return false;
    if (adminIds.length === 0) return true;
    if (adminIds.includes(String(userId))) return true;

    return false;
  } catch {
    return false;
  }
}

export function getUserId() {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = decodeJwtPayload(token);
    return payload?.sub || payload?.userId || null;
  } catch {
    return null;
  }
}
