# 🔑 COMO OBTER AS CHAVES CORRETAS DO SUPABASE

## ❌ PROBLEMA IDENTIFICADO:
A API Key no `.env` está no formato errado: `sb_publishable_...`

As chaves do Supabase são **JWTs longos** começando com `eyJ...`

---

## ✅ SOLUÇÃO - OBTER A CHAVE CORRETA:

### **PASSO 1: Acessar Configurações de API**

1. Acesse: https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm/settings/api

2. Faça login se necessário

### **PASSO 2: Copiar as Chaves**

Você verá duas chaves principais:

#### 🔓 **anon public** (para uso no frontend/backend sem privilégios)
```
Formato: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...
```
- Use esta para operações normais
- Limitada por RLS (Row Level Security)
- **COPIE ESTA CHAVE** para `SUPABASE_ANON_KEY`

#### 🔐 **service_role secret** (para uso no backend com privilégios totais)
```
Formato: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...
```
- Use esta para operações administrativas
- Bypass RLS automaticamente
- **NÃO EXPONHA** no frontend
- **COPIE ESTA CHAVE** para `SUPABASE_SERVICE_ROLE_KEY`

### **PASSO 3: Atualizar o arquivo .env**

Edite: `/home/admin_django/projetos/clientes/fps/backend/.env`

```env
PORT=4001
JWT_SECRET=segredo123

# Supabase - Usando SDK (REST API via HTTPS)
SUPABASE_URL=https://jdwgrzkxpdehrprcxxhm.supabase.co

# COPIE A CHAVE "service_role secret" DO DASHBOARD AQUI ⬇️
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR...COLE_AQUI_A_CHAVE_COMPLETA

# COPIE A CHAVE "anon public" DO DASHBOARD AQUI ⬇️ (opcional)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cC...COLE_AQUI_A_CHAVE_COMPLETA

# AppDynamics (mantenha como está)
APPD_ANALYTICS_URL=https://gru-ana-api.saas.appdynamics.com/events/query
APPD_ACCOUNT_NAME=fpsfaculdadepernambucanadesaude-prod_0d1c5bc4-c49d-46f0-b64a-59368a4fba07
APPD_API_KEY=b4145965-76de-4f3c-8b21-9d08d4006c69
APPD_APPLICATION=Aluno Online

# Resto (mantenha como está)
LOGIN_EMAIL=fps@teletex.com.br
LOGIN_PASSWORD=atV24`1FCM4£<9zu
LOGIN_USER_ID=fps_user
ADMIN_EMAIL="admin@teletex.com.br"
ADMIN_PASSWORD="T3letex@2025!"
ADMIN_USER_ID="admin_teletex"
ADMIN_USER_IDS="admin_teletex"
EXTERNAL_IP=189.45.141.181
SYNC_INTERVAL_MINUTES=2
```

### **PASSO 4: Atualizar o código para usar SERVICE_ROLE_KEY**

Execute este comando:
```bash
cd /home/admin_django/projetos/clientes/fps/backend
./atualizar_para_service_role.sh
```

### **PASSO 5: Testar novamente**
```bash
node diagnostico.js
```

Você deve ver: ✅ TUDO FUNCIONANDO CORRETAMENTE!

---

## 📝 EXEMPLO DE COMO AS CHAVES DEVEM PARECER:

### ❌ ERRADO (o que está agora):
```
SUPABASE_ANON_KEY=sb_publishable_JvtmCb5AE3IRQ1uT7NHDVA_8gVqxkpQ
```

### ✅ CORRETO (formato JWT longo):
```
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impkd2dyemt4cGRlaHJwcmN4eGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NzA2ODksImV4cCI6MjA1NTQ0NjY4OX0.gNqVCw9c9-zpKP4LLOdGBQjrKrP2gxBuwmE0dGGZRDc
```

**A chave deve ter ~200-300 caracteres e começar com `eyJ`**

---

## 🎯 RESUMO RÁPIDO:

1. **Acesse:** https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm/settings/api
2. **Copie** a chave "service_role secret" (JWT longo começando com eyJ...)
3. **Cole** no .env como `SUPABASE_SERVICE_ROLE_KEY=...`
4. **Execute:** `./atualizar_para_service_role.sh`
5. **Teste:** `node diagnostico.js`

---

💡 **DICA:** Use a **service_role** key no backend para ter permissões totais e evitar problemas com RLS!
