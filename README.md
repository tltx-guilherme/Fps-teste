# FPS Interface - Next.js Version

Sistema de monitoramento de performance e auditoria de acessos, agora rodando em Next.js e otimizado para deploy no Vercel.

## 🚀 Migração para Next.js

Este projeto foi convertido de uma arquitetura com React/Vite + Express para **Next.js**, permitindo:

- ✅ Deploy simplificado no Vercel
- ✅ API routes serverless
- ✅ Autenticação centralizada
- ✅ Melhor performance
- ✅ Sem necessidade de dois servidores separados

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Vercel (gratuita)
- Credenciais do Supabase

## 🔧 Setup Local

\`\`\`bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.local.example .env.local

# Rodar em desenvolvimento
npm run dev
\`\`\`

A aplicação estará em http://localhost:3000

## 📦 Deploy no Vercel

### Opção 1: Vercel CLI

\`\`\`bash
npm i -g vercel
vercel
\`\`\`

### Opção 2: GitHub Integration

1. Push código para GitHub
2. Acesse https://vercel.com
3. Clique "New Project"
4. Selecione seu repositório
5. Configure variáveis de ambiente
6. Clique "Deploy"

## 📝 Variáveis de Ambiente Necessárias

| Variável | Descrição |
|----------|-----------|
| SUPABASE_URL | URL do Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Chave de serviço |
| JWT_SECRET | Chave para JWT |
| ADMIN_USER_IDS | IDs de admin (opcional) |
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
