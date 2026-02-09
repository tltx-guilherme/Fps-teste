# FPS Interface (Proxy AppDynamics)

Monorepo com `backend` (Express + OAuth2 Client Credentials para AppDynamics) e `frontend` (Vite + React + Tailwind).
O backend expõe proxy seguro para `/events/query` do AppDynamics (Analytics), filtrando por RA na URL.

## Passo a passo (Windows/Unix)

### 1) Backend
```
cd backend
copy .env.example .env   # (Windows) - ou: cp .env.example .env
# edite o arquivo .env com seus valores reais (NÃO COMMITAR)
npm install
npm run dev
```

### 2) Frontend
```
cd frontend
npm install
npm run dev
```
O Vite já está com proxy (`/api -> http://localhost:3001`).

---

## Variáveis (.env do backend)
```
PORT=3001

# APPD - Tenant e OAuth
APPD_TENANT_URL=https://fpsfaculdadedepernambucanadesaude-prod.saas.appdynamics.com
APPD_AUTH_URL=__AUTO__     # deixe __AUTO__ para usar <TENANT>/auth/v1/oauth/token
APPD_CLIENT_ID=__PUT_HERE__
APPD_CLIENT_SECRET=__PUT_HERE__

# Analytics
APPD_EVENTS_URL=https://analytics.api.appdynamics.com/events/query
APPD_ACCOUNT_NAME=fpsfaculdadedependambucanadesaude

# Segurança local
JWT_SECRET=change_this_secret
```

Se seu ambiente usar endpoint diferente para Analytics, ajuste `APPD_EVENTS_URL`.
