# 🗺️ Mapa Visual do Projeto FPS Interface

## 🏢 Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR (Client)                    │
│  ┌──────────────┐        ┌──────────────┐                │
│  │  /login      │        │  /dashboard  │                │
│  │  (público)   │        │  (protegido) │                │
│  └──────────────┘        └──────────────┘                │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/HTTPS
                     │
┌────────────────────▼────────────────────────────────────┐
│           VERCEL (Next.js Server)                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │            Páginas (React/SSR)                     │ │
│  │  - app/(auth)/login/page.jsx                       │ │
│  │  - app/(protected)/page.jsx (dashboard)            │ │
│  │  - app/(protected)/auditoria/page.jsx              │ │
│  └────────────────────────────────────────────────────┘ │
│                         ▼                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │              API Routes (Serverless)                │ │
│  │  ├─ /api/auth/login                                │ │
│  │  ├─ /api/analytics/* (stats, search, logs)         │ │
│  │  ├─ /api/sync/* (POST, GET /status)                │ │
│  │  └─ /api/import                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                         ▼                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │            Shared Libraries (lib/)                  │ │
│  │  ├─ auth.js (JWT, autenticação)                    │ │
│  │  ├─ db.js (Supabase client)                        │ │
│  │  └─ api-utils.js (helpers)                         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────┬─────────────────────────────────┘
                      │
                      │ REST API / SQL
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
   ┌─────────┐            ┌──────────────────┐
   │  Auth   │            │  SUPABASE (PostgreSQL)
   │ (JWT)   │            │  - transactions
   └─────────┘            │  - search_logs
                          │  - sync_metadata
                          └──────────────────┘
```

## 🔄 Fluxo de Login

```
┌──────────────┐
│  Login Page  │
│   /login     │
└──────┬───────┘
       │ Input: email, password
       │
       ▼
┌──────────────────────────┐
│ POST /api/auth/login     │
│ (API Route)              │
└──────┬───────────────────┘
       │ Valida credenciais
       │ Gera JWT token
       │
       ▼
┌──────────────────────────┐
│  Return: { token: "..." }│
└──────┬───────────────────┘
       │ Salva em localStorage
       │ fps_token = "..."
       │
       ▼
┌──────────────────────────┐
│ Redireciona para Home    │
│ GET /                    │
└──────┬───────────────────┘
       │ Verifica token (isAuthed)
       │ Se válido: mostra Home
       │ Se inválido: redireciona /login
       │
       ▼
┌──────────────────────────┐
│  Dashboard (Protegido)   │
└──────────────────────────┘
```

## 📡 Fluxo de API Call

```
┌──────────────────────────────────┐
│  Frontend Component              │
│  const data = await fetch(       │
│    '/api/analytics/stats',       │
│    { headers: authHeaders() }    │
│  )                               │
└──────────────┬───────────────────┘
               │ HTTP GET
               │ Headers: { Authorization: Bearer ... }
               │
               ▼
┌──────────────────────────────────┐
│  Next.js Middleware              │
│  (middleware.js)                 │
│  - Permite passar                │
│  - Log de requisições (opt)      │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  API Route Handler               │
│  /api/analytics/stats/route.js   │
│  export async GET(request) {}    │
└──────────────┬───────────────────┘
               │ 1. Parse request
               │ 2. Extract token
               │ 3. Validate JWT
               │    ├─ Se 401: não autenticado
               │    └─ Se 200: continuar
               │ 4. Query Supabase
               │ 5. Process data
               │
               ▼
┌──────────────────────────────────┐
│  Supabase API                    │
│  (PostgreSQL query)              │
│  SELECT * FROM transactions      │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Return JSON Response            │
│  {                               │
│    horariosMaisUsados: [...],    │
│    recursosMaisUsados: [...],    │
│    totalEventos: 1000            │
│  }                               │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Frontend Receives Data          │
│  Update Component State          │
│  Re-render with new data         │
└──────────────────────────────────┘
```

## 🛡️ Fluxo de Autenticação

```
┌─────────────────────────────────────┐
│        REQUISIÇÃO HTTP              │
│  GET /api/analytics/stats           │
│  Headers: {                         │
│    Authorization: "Bearer eyJ0..."  │
│  }                                  │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   app/api/analytics/stats/route.js  │
│   const token = getTokenFromReq()   │
└────────────────┬────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    ┌────────┐      ┌────────────┐
    │ Null?  │      │  Decode    │
    │        │      │  JWT       │
    └────┬───┘      └─────┬──────┘
         │                │
       ┌─┴─────────────────┴──────┐
       │                          │
       ▼                          ▼
    ┌──────┐              ┌──────────────┐
    │ 401  │              │  Válido?     │
    │ Erro │              │              │
    └──────┘              └──┬───────┬───┘
                             │       │
                          Sim│       │Não
                             │       │
                             ▼       ▼
                         ┌──────┐ ┌──────┐
                         │ 200  │ │ 401  │
                         │ OK   │ │ Erro │
                         └──────┘ └──────┘
```

## 🗂️ Estrutura de Diretórios Visual

```
Fps-teste/
│
├── 📂 app/ (PÁGINAS E APIS)
│   ├── api/ (SERVERLESS FUNCTIONS)
│   │   ├── auth/login/
│   │   ├── analytics/[stats,search,logs]/
│   │   ├── sync/[route,status]/
│   │   └── import/
│   ├── (auth)/ (ROTAS PÚBLICAS)
│   │   └── login/page.jsx
│   ├── (protected)/ (ROTAS PROTEGIDAS)
│   │   ├── page.jsx (Home)
│   │   └── auditoria/page.jsx
│   ├── styles/ (CSS)
│   └── layout.jsx (ROOT LAYOUT)
│
├── 📂 lib/ (CÓDIGO COMPARTILHADO)
│   ├── auth.js (🔑 Autenticação)
│   ├── db.js (🗄️ Banco de Dados)
│   ├── api-utils.js (🛠️ Helpers)
│   └── api-examples.js (📚 Exemplos)
│
├── 📂 components/ (REACT COMPONENTS)
│   └── ProtectedRoute.jsx
│
├── 📂 public/ (STATIC FILES)
│   └── [assets]
│
├── 📂 node_modules/ (DEPENDENCIES)
│   └── [packages]
│
├── ⚙️ CONFIGURAÇÕES
│   ├── next.config.js
│   ├── jsconfig.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vercel.json
│   ├── .eslintrc.js
│   └── middleware.js
│
├── 📋 PACKAGE & ENV
│   ├── package.json
│   ├── pnpm-lock.yaml (ou package-lock.json)
│   ├── .env.local (LOCAL - NÃO COMMITAR)
│   ├── .env.local.example (TEMPLATE)
│   └── .gitignore
│
└── 📚 DOCUMENTAÇÃO
    ├── README.md (📖 Principal)
    ├── GETTING_STARTED.md (🚀 5 min)
    ├── DEPLOY_VERCEL.md (🌐 Deploy)
    ├── TESTING_GUIDE.md (🧪 Testes)
    ├── QUICK_REFERENCE.md (⚡ Quick)
    ├── CHECKLIST_FINAL.md (✅ Checklist)
    ├── PROJECT_STRUCTURE.md (🏗️ Estrutura)
    ├── SUMMARY.md (📊 Resumo)
    └── PROJECT_ARCHITECTURE.md (🗺️ Este)
```

## 🔐 Fluxo de Proteção de Rota

```
┌──────────────────────────┐
│  GET /auditoria          │
│  (Página protegida)      │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ ProtectedRoute Component │
│  adminOnly={true}        │
└────────────┬─────────────┘
             │ Verifica token
             │
        ┌────┴──────┐
        │            │
        ▼            ▼
   ┌────────┐   ┌─────────┐
   │Authed? │   │ Admin?  │
   └────┬───┘   └────┬────┘
        │             │
      Não           Não
        │             │
        ▼             ▼
   ┌────────────┐  ┌────────────┐
   │ Redirect   │  │ Redirect   │
   │ /login     │  │ / (home)   │
   └────────────┘  └────────────┘
        
        Sim        Sim
        │            │
        └────┬───────┘
             │
             ▼
        ┌──────────┐
        │ Renderiza│
        │ Página   │
        └──────────┘
```

## 📊 Ciclo de Vida de uma Requisição

```
TIME ─────────────────────────────────────────────────────>

1ms │ Userclicks
    │ "Get Stats"
    │
5ms │ Fetch API
    │ POST + Bearer Token
    │
10ms│ Network
    │ Vercel Server
    │
15ms│ Middleware
    │ Validation
    │
25ms│ API Route
    │ JWT Check
    │
30ms│ Supabase
    │ Query DB
    │
80ms│ Process
    │ Data
    │
90ms│ Return
    │ JSON Response
    │
95ms│ Browser
    │ Renders
    │
100ms│ User sees
    │ Updated UI
```

---

**Visão Completa da Arquitetura** 🏗️

*Seu projeto está estruturado de forma profissional e pronto para produção!*
