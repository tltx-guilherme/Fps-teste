# 🗄️ SISTEMA SUPABASE PostgreSQL - GUIA COMPLETO

## 📍 Informações da Conexão:

### Credenciais Supabase:
- **URL**: https://jdwgrzkxpdehrprcxxhm.supabase.co
- **Database Host**: db.jdwgrzkxpdehrprcxxhm.supabase.co
- **Porta**: 5432
- **Database**: postgres
- **Usuário**: postgres
- **API Key (Publishable)**: sb_publishable_JvtmCb5AE3IRQ1uT7NHDVA_8gVqxkpQ

### 📂 Estrutura de Arquivos:
```
/home/admin_django/projetos/clientes/fps/backend/
├── .env                       # Variáveis de ambiente (credenciais)
├── db/
│   └── syncService.js         # Lógica de sincronização com PostgreSQL
├── controllers/
│   └── analyticsController.js # Controladores de análise
├── routes/
│   ├── analytics.js           # Rotas de analytics
│   └── sync.js                # Rotas de sincronização
└── server.js                  # Servidor principal
```

## 🗂️ ESTRUTURA DO BANCO DE DADOS:

### Tabelas:

#### 1. **transactions** - Armazena todas as transações do AppDynamics
```sql
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  url TEXT,
  url_resumida TEXT,
  horario BIGINT,
  saude TEXT,
  error_code TEXT,
  ra TEXT,
  synced_at BIGINT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);
```

**Índices:**
- `idx_ra` em `ra`
- `idx_horario` em `horario`
- `idx_saude` em `saude`
- `idx_synced_at` em `synced_at`
- `idx_unique_event` UNIQUE em `(url, horario)`

#### 2. **search_logs** - Armazena logs de pesquisa por RA
```sql
CREATE TABLE search_logs (
  id BIGSERIAL PRIMARY KEY,
  ra TEXT NOT NULL,
  user_id TEXT NOT NULL,
  ip TEXT,
  searched_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);
```

**Índices:**
- `idx_search_ra` em `ra`
- `idx_search_user` em `user_id`
- `idx_search_time` em `searched_at`

#### 3. **sync_metadata** - Metadados de sincronização
```sql
CREATE TABLE sync_metadata (
  id BIGSERIAL PRIMARY KEY,
  last_sync BIGINT,
  total_records BIGINT,
  sync_status TEXT,
  error_message TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);
```

## 🚀 COMANDOS PRINCIPAIS:

### 1. Conectar ao Supabase via psql:
```bash
PGPASSWORD='8rBkPkwl8k6cAcMO' psql -h db.jdwgrzkxpdehrprcxxhm.supabase.co -p 5432 -U postgres -d postgres
```

### 2. Ver total de transações:
```sql
SELECT COUNT(*) FROM transactions;
```

### 3. Ver estatísticas por saúde:
```sql
SELECT saude, COUNT(*) as total 
FROM transactions 
GROUP BY saude 
ORDER BY total DESC;
```

### 4. Pesquisar transações por RA:
```sql
SELECT url, url_resumida, horario, saude, error_code
FROM transactions 
WHERE ra = '2023123046' 
ORDER BY horario DESC 
LIMIT 10;
```

### 5. Ver transações com erro:
```sql
SELECT url, error_code, COUNT(*) as qtd
FROM transactions 
WHERE error_code IS NOT NULL 
GROUP BY url, error_code 
ORDER BY qtd DESC 
LIMIT 20;
```

### 6. Ver últimas sincronizações:
```sql
SELECT last_sync, total_records, sync_status, error_message
FROM sync_metadata 
ORDER BY id DESC 
LIMIT 5;
```

### 7. Ver logs de pesquisa:
```sql
SELECT ra, user_id, ip, searched_at
FROM search_logs 
ORDER BY searched_at DESC 
LIMIT 20;
```

## 🔧 COMO FUNCIONA A SINCRONIZAÇÃO:

### Fluxo de Sincronização:
1. **Baseline**: Na primeira execução, cria um registro baseline sem puxar dados históricos
2. **Incremental**: A partir da segunda execução, busca apenas eventos novos desde o último sync
3. **Automático**: Executa automaticamente a cada 2 minutos
4. **Limpeza**: Remove automaticamente dados com mais de 1 ano

### Características:
- ✅ Busca apenas eventos NOVOS (evita duplicação)
- ✅ Mantém histórico de 1 ANO
- ✅ Processa até 50.000 eventos por sincronização
- ✅ Usa índice único `(url, horario)` para evitar duplicatas
- ✅ Sincronização automática a cada 2 minutos
- ✅ Conexão segura via SSL

## 📊 VERIFICAR FUNCIONAMENTO:

### Via API (curl):
```bash
# Status da sincronização
curl http://localhost:4001/api/sync/status

# Forçar sincronização manual
curl -X POST http://localhost:4001/api/sync \
  -H "Content-Type: application/json" \
  -d '{"force": true, "limit": 50000}'

# Ver estatísticas locais (últimos 7 dias)
curl "http://localhost:4001/api/stats/local?days=7&limit=10000"
```

### Via Supabase Dashboard:
1. Acesse: https://jdwgrzkxpdehrprcxxhm.supabase.co/project/jdwgrzkxpdehrprcxxhm
2. Vá em "Table Editor"
3. Selecione a tabela desejada
4. Execute queries ou visualize dados

## ⚙️ CONFIGURAÇÃO DO AMBIENTE:

### Arquivo .env necessário:
```env
PORT=4001
JWT_SECRET=segredo123

# Supabase PostgreSQL
DATABASE_URL=postgresql://postgres:8rBkPkwl8k6cAcMO@db.jdwgrzkxpdehrprcxxhm.supabase.co:5432/postgres
PGSSL=true

# Supabase API (opcional)
NEXT_PUBLIC_SUPABASE_URL=https://jdwgrzkxpdehrprcxxhm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_JvtmCb5AE3IRQ1uT7NHDVA_8gVqxkpQ

# AppDynamics
APPD_ANALYTICS_URL=https://gru-ana-api.saas.appdynamics.com/events/query
APPD_ACCOUNT_NAME=fpsfaculdadepernambucanadesaude-prod_0d1c5bc4-c49d-46f0-b64a-59368a4fba07
APPD_API_KEY=b4145965-76de-4f3c-8b21-9d08d4006c69
APPD_APPLICATION=Aluno Online

# Sync
SYNC_INTERVAL_MINUTES=2
```

## 🔍 MONITORAMENTO:

### Logs do servidor:
```bash
# Ver logs em tempo real
tail -f /home/admin_django/projetos/clientes/fps/backend/nohup.out

# Ver últimas 100 linhas
tail -n 100 /home/admin_django/projetos/clientes/fps/backend/nohup.out
```

### Verificar processo:
```bash
# Ver se o servidor está rodando
ps aux | grep "node.*server.js"

# Ver porta em uso
netstat -tlnp | grep 4001
```

## 🚨 TROUBLESHOOTING:

### Problema: Conexão recusada
**Solução**: Verificar se SSL está habilitado e credenciais corretas

### Problem: Duplicatas sendo inseridas
**Solução**: O índice único `idx_unique_event` deve prevenir isso. Verificar se existe:
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'transactions';
```

### Problema: Sincronização não está rodando
**Solução**: 
1. Reiniciar servidor
2. Verificar logs para erros
3. Testar sincronização manual via API

### Problema: Dados antigos no banco
**Solução**: 
```sql
-- Limpar dados com mais de 1 ano
DELETE FROM transactions WHERE horario < EXTRACT(EPOCH FROM NOW() - INTERVAL '1 year') * 1000;
```

## 📈 MIGRAÇÕES FUTURAS:

Se precisar usar o SDK do Supabase no futuro para recursos adicionais (Storage, Auth, Realtime), instale:
```bash
npm install @supabase/supabase-js
```

E use:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jdwgrzkxpdehrprcxxhm.supabase.co'
const supabaseKey = 'sb_publishable_JvtmCb5AE3IRQ1uT7NHDVA_8gVqxkpQ'
const supabase = createClient(supabaseUrl, supabaseKey)
```

## ✅ VANTAGENS DO SUPABASE:

- 🚀 **Performance**: PostgreSQL otimizado
- 🔒 **Segurança**: SSL/TLS, backups automáticos
- 📊 **Dashboard**: Interface visual para gerenciar dados
- 🌐 **Escalabilidade**: Suporte a milhões de registros
- 🔄 **Realtime**: Suporte a subscriptions (se necessário)
- 💾 **Backups**: Backups diários automáticos
- 📈 **Analytics**: Métricas de uso no dashboard

## 📞 SUPORTE:

- Dashboard Supabase: https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm
- Documentação: https://supabase.com/docs
- Status: https://status.supabase.com/
