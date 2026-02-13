import jwt from "jsonwebtoken";

// Decodifica JWT e anexa req.userId (já existe um similar no server, mas este é útil para rotas específicas)
export function decodeJwt(req, _res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = payload?.sub || null;
      req.tokenPayload = payload || null;
    } catch {
      req.userId = null;
      req.tokenPayload = null;
    }
  }
  next();
}

// Exige usuário autenticado
export function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  next();
}


// Exige admin. Se a env ADMIN_USER_IDS existir, valida contra ela; se não existir, permite qualquer autenticado.
export function requireAdmin(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  const list = (process.env.ADMIN_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  const loginUserId = process.env.LOGIN_USER_ID || "";
  if (list.length === 0) return next(); // sem configuração → não restringe além de login
  if (list.includes(String(req.userId))) return next();
  if (loginUserId && String(req.userId) === String(loginUserId)) return next();
  return res.status(403).json({ error: "Acesso negado" });
}
