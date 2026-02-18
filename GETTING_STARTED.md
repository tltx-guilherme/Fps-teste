# 🚀 COMO COMEÇAR - FPS Interface em Next.js para Vercel

> Sua aplicação foi completamente convertida de Express + React/Vite para **Next.js**!
> Agora é muito mais simples de manter, escalar e fazer deploy.

## 5 Minutos - Rodar Localmente

```bash
# 1️⃣ Instalar tudo
npm install

# 2️⃣ Copiar arquivo de configuração
cp .env.local.example .env.local

# 3️⃣ Editar .env.local com suas credenciais:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - JWT_SECRET

# 4️⃣ Iniciar servidor
npm run dev

# 5️⃣ Abrir no navegador
# http://localhost:3000
```

## 🎯 O que Mudou?

| Antes | Agora |
|-------|-------|
| 2 servidores (Express + Vite) | 1 servidor (Next.js) |
| Port 4001 (backend) + 5173 (frontend) | Port 3000 |
| Proxy de /api para localhost:4001 | API routes built-in |
| React Router para navegação | Next.js App Router |
| Vite para build | Next.js para build |

## 📁 Arquivos Principais

```
app/
├── api/              ← Suas APIs (antes eram Express routes)
├── (protected)/      ← Páginas protegidas
├── (auth)/          ← Página de login
└── layout.jsx       ← Layout principal

lib/
├── auth.js          ← JWT, autenticação
├── db.js            ← Supabase client
└── api-utils.js     ← Helpers para APIs
```

## 📚 Documentação

- **Para entender tudo**: Leia [README.md](README.md)
- **Para fazer deploy**: Leia [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)
- **Para referência rápida**: Leia [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Para testes**: Leia [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Checklist completo**: Leia [CHECKLIST_FINAL.md](CHECKLIST_FINAL.md)

## 🔌 Configuração Essencial

Edite seu `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_longa_aqui
JWT_SECRET=uma_chave_super_secreta_aleatorio
```

> ⚠️ **Nunca** commit `.env.local`! Está no `.gitignore`

## 🌐 Para Fazer Deploy no Vercel

### Opção A: Clique e pronto (GitHub)

1. Faça push para GitHub:
   ```bash
   git add .
   git commit -m "Convert to Next.js"
   git push
   ```

2. Visite https://vercel.com
3. Clique "Add New Project"
4. Selecione seu repositório GitHub
5. Configure variáveis de ambiente
6. Clique Deploy

### Opção B: Terminal (Vercel CLI)

```bash
npm install -g vercel    # Uma vez
vercel --prod            # Deploy agora
```

## ✅ Testar Antes de Deploy

```bash
# Build local
npm run build

# Rodar production build
npm start

# Deve estar em http://localhost:3000
```

## 🔑 Variáveis no Vercel

No painel Vercel → Settings → Environment Variables, adicione:

```
SUPABASE_URL = https://seu-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY = sua_chave_aqui
JWT_SECRET = sua_chave_secreta
ADMIN_USER_IDS = user1,user2
NEXT_PUBLIC_SUPABASE_URL = https://seu-id.supabase.co
```

## 📚 Estrutura de Rotas

### Páginas (Servidor web)
```
GET  /                    → Home (protegida)
GET  /login              → Login (pública)
GET  /auditoria          → Auditoria (protegida, admin only)
```

### APIs (Servidor API)
```
POST /api/auth/login     → Login
GET  /api/analytics/stats              → Estatísticas
GET  /api/analytics/search/[ra]        → Buscar por RA
GET  /api/analytics/logs               → Logs (admin)
POST /api/sync                         → Sincronizar
GET  /api/sync/status                  → Status de sync
POST /api/import                       → Importar dados
```

## 🎨 Customizar a Aplicação

### Adicionar nova página
```jsx
// app/(protected)/minha-page/page.jsx
export default function Page() {
  return <h1>Minha Página</h1>
}
```

### Adicionar novo componente
```jsx
// components/MeuComponente.jsx
export default function MeuComponente() {
  return <div>Meu componente</div>
}
```

### Adicionar nova API
```javascript
// app/api/novo-endpoint/route.js
export async function GET(request) {
  return Response.json({ dados: "aqui" })
}
```

## 🚨 Problemas Comuns

| Erro | Solução |
|------|---------|
| "Cannot find module @/" | Execute `npm install` |
| 404 em API | Verifique pasta em `app/api/` |
| 401 em endpoint | Verifique token JWT |
| "Database not found" | Verifique credenciais Supabase |
| Build fails | Veja `npm run build` localmente |

## 💡 Dicas

- Rode `npm run dev` diariamente
- Use DevTools (F12) para debug
- Verifique logs com `vercel logs --prod`
- Sempre test localmente antes de deploy
- Mantenha `.env.local` seguro (nunca commit)

## 🔗 Links Importantes

- 📖 [Next.js Docs](https://nextjs.org/docs) - Documentação oficial
- 🚀 [Vercel Docs](https://vercel.com/docs) - Como fazer deploy
- 🗄️ [Supabase Docs](https://supabase.com/docs) - Banco de dados
- 🔐 [JWT.io](https://jwt.io) - Token encoding

## 📞 Suporte

Se tiver dúvidas:
1. Procure em um dos links acima
2. Verifique os logs: `vercel logs --prod`
3. Teste localmente com `npm run dev`
4. Veja a documentação em `TESTING_GUIDE.md`

## ⚡ Próximas Ações

- [ ] Configure `.env.local` com suas credenciais
- [ ] Rode `npm install`
- [ ] Rode `npm run dev`
- [ ] Teste login em http://localhost:3000/login
- [ ] Leia [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)
- [ ] Faça deploy no Vercel
- [ ] Configure domínio customizado (opcional)

---

**Parabéns! 🎉 Sua aplicação está pronta para produção!**

**Versão:** 2.0.0 (Next.js)  
**Data:** 13/02/2026
