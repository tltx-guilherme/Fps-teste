import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import axios from "axios";
import jwt from "jsonwebtoken";
import { initDatabase, startAutoSync } from "./db/syncService.js";


// ========================
// CRIAR EXPRESS ANTES DE USAR ROTAS
// ========================

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Middleware simples para extrair usuário do JWT (se presente)
app.use((req, res, next) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = payload?.sub || null;
    } catch {
      // token inválido: segue sem userId
      req.userId = null;
    }
  }
  next();
});

import analyticsRoutes from "./routes/analytics.js";
import syncRoutes from "./routes/sync.js";
app.use("/api/analytics", analyticsRoutes);
app.use("/api", syncRoutes);

const {
  PORT,
  JWT_SECRET,
  APPD_API_KEY,
  APPD_ACCOUNT_NAME,
  APPD_ANALYTICS_URL,
  LOGIN_EMAIL,
  LOGIN_PASSWORD,
  LOGIN_USER_ID,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_USER_ID,
  ADMIN_USER_IDS,
  EXTERNAL_IP,
  SYNC_INTERVAL_MINUTES,
} = process.env;

// Validações críticas
if (!PORT) throw new Error("❌ PORT não definida no .env");
if (!JWT_SECRET) throw new Error("❌ JWT_SECRET não definido no .env");
if (!APPD_API_KEY) throw new Error("❌ APPD_API_KEY não definida no .env");
if (!APPD_ACCOUNT_NAME) throw new Error("❌ APPD_ACCOUNT_NAME não definida no .env");
if (!APPD_ANALYTICS_URL) throw new Error("❌ APPD_ANALYTICS_URL não definida no .env");
if (!LOGIN_EMAIL) throw new Error("❌ LOGIN_EMAIL não definido no .env");
if (!LOGIN_PASSWORD) throw new Error("❌ LOGIN_PASSWORD não definida no .env");
if (!LOGIN_USER_ID) throw new Error("❌ LOGIN_USER_ID não definido no .env");
if (!EXTERNAL_IP) throw new Error("❌ EXTERNAL_IP não definido no .env");
if (!SYNC_INTERVAL_MINUTES) throw new Error("❌ SYNC_INTERVAL_MINUTES não definido no .env");

const users = [
  {
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
    id: LOGIN_USER_ID,
    role: 'user'
  }
];

// Adiciona admin se configurado
if (ADMIN_EMAIL && ADMIN_PASSWORD && ADMIN_USER_ID) {
  users.push({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    id: ADMIN_USER_ID,
    role: 'admin'
  });
}

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ message: "Credenciais inválidas" });
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "8h",
  });

  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

// ========================
// START SERVER
// ========================

// Inicializa banco de dados SQLite
console.log('🗄️  Inicializando banco de dados...');
initDatabase();

// Inicia sincronização automática a cada 2 minutos
startAutoSync(parseInt(SYNC_INTERVAL_MINUTES) || 2);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API FPS rodando em http://0.0.0.0:${PORT}`);
  console.log(`📡 Acessível externamente em http://${EXTERNAL_IP}:${PORT}`);
  console.log(`🔄 Sincronização automática ativada (intervalo: ${SYNC_INTERVAL_MINUTES} minutos)`);
});
