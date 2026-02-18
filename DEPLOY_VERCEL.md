# Guia de Deploy no Vercel

## 📋 Checklist Pré-Deploy

- [ ] Código está no GitHub
- [ ] Todas as variáveis de ambiente foram definidas em `.env.local`
- [ ] Testado localmente com `npm run dev`
- [ ] Build passa com `npm run build`
- [ ] Tabelas do Supabase foram criadas
- [ ] Chaves de API do AppDynamics (se usar) estão corretas

## 🚀 Opção 1: Deploy com Vercel CLI

### 1. Instalar Vercel CLI

\`\`\`bash
npm install -g vercel
\`\`\`

### 2. Fazer login

\`\`\`bash
vercel login
\`\`\`

### 3. Deploy

\`\`\`bash
vercel --prod
\`\`\`

Você será questionado sobre configurações. Responda:
- Link to existing project? **N** (primeira vez)
- Project name? **fps-interface** (ou seu nome)
- Where is your code? **.** (ponto = diretório atual)
- Want to modify vercel.json? **N**

## 🚀 Opção 2: Deploy com GitHub

### 1. Fazer push para GitHub

\`\`\`bash
git add .
git commit -m "Convert to Next.js for Vercel"
git push origin main
\`\`\`

### 2. Conectar ao Vercel

1. Visite https://vercel.com/dashboard
2. Clique "Add New Project"
3. Selecione "Import Git Repository"
4. Procure seu repositório
5. Clique "Import"

### 3. Configurar Variáveis de Ambiente

No painel do Vercel:

1. Vá para "Settings" → "Environment Variables"
2. Adicione cada variável:

\`\`\`
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_longa
JWT_SECRET=sua_chave_muito_secreta
ADMIN_USER_IDS=user1,user2
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
\`\`\`

3. Clique "Save"
4. Clique "Deploy"

## 🔍 Verificações Pós-Deploy

### 1. Verificar Logs

\`\`\`bash
vercel logs --prod
\`\`\`

### 2. Testar Login

Visite: https://seu-projeto.vercel.app/login

### 3. Testar API

\`\`\`bash
curl https://seu-projeto.vercel.app/api/sync/status
\`\`\`

Deve retornar JSON com status

## 🐛 Troubleshooting

### Build falha

**Erro:** "Cannot find module"

**Solução:**
- Verifique imports no código
- Certifique-se de que todos os arquivos existem
- Execute \`npm install\` localmente e teste

### API retorna 500

**Erro:** "Database connection failed"

**Solução:**
- Verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão corretos
- Verifique se as tabelas existem no Supabase
- Visite Supabase Dashboard → Logs → Verificar erros

### NextAuth erro

**Erro:** "JWT verification failed"

**Solução:**
- Certifique-se que JWT_SECRET está configurada
- A chave deve ser a mesma que em development

### Timeout nas requisições

**Erro:** "Function execution time exceeded limit"

**Solução:**
- Vercel tem limite de 10 segundos (grátis) ou 25s (Pro)
- Se a operação demora mais, divida em múltiplas funções
- Considere usar background jobs

## 📊 Monitorar em Produção

### Vercel Analytics

1. Painel Vercel → "Analytics"
2. Ver performance, latência, erros

### Supabase Logs

1. Visite Supabase Dashboard
2. Clique "Logs"
3. Veja erros de banco de dados

### Integração com Sentry (Opcional)

\`\`\`bash
npm install @sentry/nextjs
\`\`\`

Adicione em next.config.js:

\`\`\`javascript
const withSentryConfig = require("@sentry/nextjs/withSentryConfig");

module.exports = withSentryConfig(
  { /* seu config Next.js */ },
  { org: "seu-org", project: "seu-projeto" }
);
\`\`\`

## 🔄 Atualizações Contínuas

### Auto-Deploy com Git

Qualquer push para \`main\` causa auto-deploy:

\`\`\`bash
git push origin main
\`\`\`

Verifique o status em: https://vercel.com/dashboard

## 🎯 URLs Importantes

- Production: https://seu-projeto.vercel.app
- Painel Vercel: https://vercel.com/dashboard
- Supabase: https://supabase.com/dashboard
- GitHub: https://github.com/seu-usuario/seu-repo

## 📞 Suporte

- Docs Vercel: https://vercel.com/docs
- Docs Next.js: https://nextjs.org/docs
- Docs Supabase: https://supabase.com/docs
- Status Page: https://www.vercelstatus.com
