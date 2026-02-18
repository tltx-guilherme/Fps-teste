# 📚 Referência Rápida - FPS Interface Next.js

## 🏗️ Estrutura de Pastas

```
app/
  api/                    # API Routes (substituem Express)
    analytics/
      stats/route.js      # GET /api/analytics/stats
      search/[ra]/        # GET /api/analytics/search/{ra}
      logs/route.js       # GET /api/analytics/logs
    sync/
      route.js            # POST/GET /api/sync
      status/route.js     # GET /api/sync/status
    import/route.js       # POST /api/import
    auth/
      login/route.js      # POST /api/auth/login
  
  (auth)/                 # Group - Rotas públicas
    login/page.jsx
  
  (protected)/            # Group - Rotas protegidas
    page.jsx              # Dashboard
    auditoria/page.jsx
  
  layout.jsx              # Layout raiz
  styles/                 # CSS

lib/
  auth.js                 # JWT, localStorage, funções de auth
  db.js                   # Cliente Supabase
  api-utils.js            # getQueryParam, requireAuth, etc

components/
  ProtectedRoute.jsx      # Wrapper para rotas protegidas

public/                   # Arquivos estáticos
```

## 🔑 Variáveis de Ambiente

| Variável | Onde usar | Obrigatória |
|----------|-----------|-----------|
| SUPABASE_URL | lib/db.js | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | lib/db.js | ✅ |
| JWT_SECRET | lib/auth.js | ✅ |
| ADMIN_USER_IDS | lib/auth.js | ❌ |
| NEXT_PUBLIC_SUPABASE_URL | Frontend | ❌ |

Note: Variáveis com prefixo `NEXT_PUBLIC_` são expostas ao browser.

## 📡 API Routes - Pattern

```javascript
// app/api/seu-endpoint/route.js

import { jsonResponse, errorResponse } from '@/lib/api-utils';

export async function GET(request) {
  try {
    // request = NextRequest object
    // params extraído do path automaticamente
    
    const valor = getQueryParam(request, 'param');
    
    return jsonResponse({ dados: "resposta" });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function POST(request) {
  try {
    const body = await getRequestBody(request);
    // ... processar
    return jsonResponse({ sucesso: true });
  } catch (error) {
    return errorResponse(error, 400);
  }
}
```

## 🔐 Proteger API Routes

```javascript
import { requireAuth, requireAdmin } from '@/lib/api-utils';

// Simples
const handler = async (request) => {
  // seu código
};

export const GET = requireAuth(handler);     // Requer autenticação
export const POST = requireAdmin(handler);   // Requer admin
```

## 🖥️ Criar Páginas

```javascript
// app/(protected)/minha-pagina/page.jsx

'use client';  // Necessário para interatividade

import ProtectedRoute from '@/components/ProtectedRoute';

export default function MinhaPage() {
  return (
    <ProtectedRoute adminOnly={false}>
      <h1>Minha Página</h1>
    </ProtectedRoute>
  );
}
```

## 🎨 Fazer Requisições HTTP

```javascript
// Use fetch nativo (Next.js 13+)

// GET
const res = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await res.json();

// POST
const res = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ dados: "aqui" })
});
```

## 🔄 Fluxo de Autenticação

1. Usuário faz login em `/login`
2. Post para `/api/auth/login` com email/senha
3. Servidor retorna JWT
4. Frontend armazena em localStorage (chave: `fps_token`)
5. Toda requisição inclui `Authorization: Bearer... `
6. Servidor valida JWT com `getUserIdFromRequest()`
7. Se inválido: 401 (não autenticado)
8. Se não admin: 403 (proibido)

## 🚀 Build & Deploy

```bash
npm run dev      # Desenvolvimento local
npm run build    # Build para produção
npm start        # Rodar build em localhost
npm run lint     # Verificar código

# Vercel
vercel           # Deploy automático
vercel --prod    # Deploy para production
```

## 🐛 Debug

```javascript
// No servidor:
console.log("mensagem"); // Visto em terminal / Vercel logs

// No browser:
console.log("mensagem"); // Visto no DevTools

// Variáveis de ambiente
console.log(process.env.JWT_SECRET); // Servidor
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL); // Cliente
```

## 📦 Adicionar Dependências

```bash
npm install pacote-novo
npm install --save-dev pacote-dev
npm uninstall pacote-velho
```

## 🔗 Links Úteis

- Next.js Docs: https://nextjs.org/docs
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

## 💡 Dicas Úteis

- Use `'use client'` no topo para componentes interativos
- Use `'use server'` para Server Components
- Layout groups `(name)` não afetam rotas
- `[param]` = segmento dinâmico
- `[...param]` = catch-all route
- Middleware em `middleware.js` roda ANTES de tudo
