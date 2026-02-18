// Server-only auth utilities (uses jsonwebtoken - Node.js only)
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// Verifica e decodifica JWT do header Authorization
export function getTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return token;
}

// Decodifica e valida JWT
export function verifyToken(token) {
  if (!token) return null;
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

// Extrai userId do token
export function getUserIdFromRequest(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  
  const payload = verifyToken(token);
  return payload?.sub || payload?.userId || null;
}

// Verifica se é admin
export function isAdminFromRequest(request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return false;
  
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  const loginUserId = process.env.LOGIN_USER_ID || '';
  
  if (adminIds.length === 0) return true; // sem restrição
  if (adminIds.includes(String(userId))) return true;
  if (loginUserId && String(userId) === String(loginUserId)) return true;
  
  return false;
}
