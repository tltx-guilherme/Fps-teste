# 🧪 Guia de Testes - FPS Interface Next.js

## 🏃 Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis (copiar e editar)
cp .env.local.example .env.local

# 3. Iniciar servidor de desenvolvimento
npm run dev

# 4. Abrir em navegador
# http://localhost:3000
```

## ✅ Testes Locais

### 1. Teste de Login

**URL:** http://localhost:3000/login

**Passos:**
1. Acesse a página de login
2. Tente fazer login (implementar endpoint de auth real)
3. Após login, verifique token em:
   - DevTools → Application → LocalStorage → fps_token
4. Acesse http://localhost:3000 (deve aceitar sem redirecionar para login)

```javascript
// Testar no console do browser
localStorage.getItem('fps_token')  // Deve retornar token
```

### 2. Teste de API com curl

```bash
# Testar GET /api/sync/status (sem auth)
curl http://localhost:3000/api/sync/status

# Testar com token (substituir TOKEN_AQUI)
curl -H "Authorization: Bearer TOKEN_AQUI" \
  http://localhost:3000/api/analytics/stats

# Testar POST /api/sync
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000, "force": true}'
```

### 3. Teste com Postman/Insomnia

**Configurar Coleção:**

1. Criar nova collection "FPS Interface"
2. Adicionar variável:
   - Nome: `token`
   - Valor: (deixar vazio)
   - Escopo: Collection

3. Criar requests:

#### Request 1: Login
- **Method:** POST
- **URL:** http://localhost:3000/api/auth/login
- **Body (JSON):**
  ```json
  {
    "email": "teste@example.com",
    "password": "senha123"
  }
  ```
- **Scripts → Tests:**
  ```javascript
  var jsonData = pm.response.json();
  pm.collectionVariables.set("token", jsonData.token);
  ```

#### Request 2: Get Stats
- **Method:** GET
- **URL:** http://localhost:3000/api/analytics/stats?days=7
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

#### Request 3: Search by RA
- **Method:** GET
- **URL:** http://localhost:3000/api/analytics/search/23001234
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

#### Request 4: Sync Status
- **Method:** GET
- **URL:** http://localhost:3000/api/sync/status

#### Request 5: Force Sync
- **Method:** POST
- **URL:** http://localhost:3000/api/sync
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "limit": 50000,
    "force": true
  }
  ```

### 4. Teste de Build

```bash
# Build para produção
npm run build

# Rodar build localmente
npm start

# Testar em http://localhost:3000
```

### 5. Teste de Estrutura

```bash
# Verificar se todos os arquivos existem
ls -R app/
ls -R lib/
ls app/api/analytics/stats/route.js
ls app/api/sync/status/route.js
```

## 🔍 Verificações no Browser

### DevTools Console

```javascript
// Verificar autenticação
localStorage.getItem('fps_token')

// Limpar token (para testar login novamente)
localStorage.clear()

// Verificar variáveis de ambiente (só NEXT_PUBLIC_*)
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

### Network Tab

Ao fazer requisições, deveria ver:

- **Requisição de Login:**
  - Status: 200
  - Response: `{ token: "...", user: {...} }`

- **Requisição com Auth:**
  - Headers deve ter: `Authorization: Bearer ...`
  - Status: 200 (sucesso) ou 401 (não autenticado)

## 📊 Teste de Performance

```bash
# Usar Lighthouse (Chrome DevTools)
# Ou usar:
npm install -g lighthouse

lighthouse http://localhost:3000

# Verificar bundle size
npm install -g next-bundle-analyzer
ANALYZE=true npm run build
```

## 🐛 Debug Mode

### Variáveis de Environment

```bash
# Ver o que foi carregado
console.log(process.env)

# Server-side (pode ver no console do terminal)
# Client-side (só NEXT_PUBLIC_*)
```

### Next.js Debug

```javascript
// Em qualquer arquivo do Next.js
console.log = function() {
  console.trace(...arguments)
}
```

## 📋 Teste Completo (Checklist)

- [ ] `npm install` funciona
- [ ] `npm run dev` inicia sem erro
- [ ] http://localhost:3000/login carrega
- [ ] Componente Login renderiza
- [ ] Pode fazer submit de form
- [ ] `/api/auth/login` retorna resposta
- [ ] Token salva em localStorage
- [ ] Redireciona para home após login
- [ ] Home page carrega (protegida)
- [ ] Auditoria só acessível com admin
- [ ] `/api/sync/status` retorna JSON
- [ ] `/api/analytics/stats` requer auth
- [ ] `npm run build` passa sem erro
- [ ] `npm start` roda build
- [ ] ESLint passa (`npm run lint`)

## 🚀 Teste em Produção (Vercel)

```bash
# Após deployer no Vercel
curl https://seu-projeto.vercel.app/api/sync/status

# Deve retornar:
# {"status":"active","lastSync":"...","totalRecords":0,"timestamp":"..."}
```

## 📱 Teste Cross-Browser

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile (Chrome Mobile)

## ⚡ Teste de Carregamento

```bash
# Medir tempo de resposta
time curl http://localhost:3000/api/sync/status

# Deve ser < 200ms
```

## 📸 Screenshots para Validação

Tire prints de:
1. Login page carregando
2. Dashboard após login
3. Auditoria (admin)
4. Response do /api/sync/status no DevTools
5. LocalStorage com token

## ✨ Resultado Esperado

Após todos os testes:
- ✅ Aplicação roda localmente sem erro
- ✅ APIs respondem corretamente
- ✅ Autenticação funciona
- ✅ Rotas protegidas funcionam
- ✅ Build é bem-sucedido
- ✅ Pronto para deploy Vercel

---

*Guia de Testes - FPS Interface v2.0*
