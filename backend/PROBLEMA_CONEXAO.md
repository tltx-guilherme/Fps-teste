# ⚠️ PROBLEMA DE CONEXÃO DETECTADO

## 🔍 Diagnóstico:

Erro encontrado: `ENETUNREACH 2600:1f18:...` - Tentando usar IPv6 mas a rede não está alcançável.

## 🎯 Causa:

O Supabase Free Tier tem limitações de conexão direta ao PostgreSQL:
- Bloqueia conexões diretas de IPs externos por padrão
- Requer uso do **Connection Pooler** para conexões externas
- A porta padrão 5432 é bloqueada, use porta 6543 (pooler)

## ✅ Solução:

### Opção 1: Usar Connection Pooler (Recomendado para Free Tier)

Altere seu `.env` de:
```env
DATABASE_URL=postgresql://postgres:8rBkPkwl8k6cAcMO@db.jdwgrzkxpdehrprcxxhm.supabase.co:5432/postgres
```

Para usar o **Pooler** (porta 6543):
```env
# Usar Transaction Mode ou Session Mode
DATABASE_URL=postgresql://postgres.jdwgrzkxpdehrprcxxhm:8rBkPkwl8k6cAcMO@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Ou alternativamente (IPv4 pooler)
DATABASE_URL=postgresql://postgres:8rBkPkwl8k6cAcMO@db.jdwgrzkxpdehrprcxxhm.supabase.co:6543/postgres?sslmode=require
```

### Opção 2: Obter a Connection String correta do Dashboard

1. Acesse: https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm/settings/database
2. Na seção **Connection String**, escolha:
   - **Session mode** (para aplicações que mantêm conexão)
   - **Transaction mode** (para serverless/funções)
3. Copie a connection string fornecida

### Opção 3: Usar Supabase Client SDK (Alternativa)

Se as opções acima não funcionarem, você pode usar o SDK do Supabase ao invés de conexão direta:

```bash
npm install @supabase/supabase-js
```

E substituir o código em `syncService.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jdwgrzkxpdehrprcxxhm.supabase.co',
  'sb_publishable_JvtmCb5AE3IRQ1uT7NHDVA_8gVqxkpQ'
)

// Em vez de pool.query(...), use:
const { data, error } = await supabase
  .from('transactions')
  .select('*')
```

## 🔧 Verificação no Dashboard Supabase:

1. Acesse: https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm
2. Vá em **Settings** → **Database**
3. Role até **Connection String**
4. Copie a string de conexão correta para **Session pooling** ou **Transaction pooling**

## 📋 Configurações Recomendadas:

### Para aplicações persistentes (como seu backend):
```env
# Use Session Mode com porta 6543
DATABASE_URL=postgresql://postgres.jdwgrzkxpdehrprcxxhm:8rBkPkwl8k6cAcMO@aws-0-us-east-1.pooler.supabase.com:6543/postgres
PGSSL=true
```

### Configuração adicional no código (se necessário):
```javascript
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10, // máximo de conexões
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})
```

## 🎯 Próximos Passos:

1. **Obter a connection string correta do dashboard Supabase**
2. **Atualizar o .env com a string correta (usando porta 6543)**
3. **Testar novamente com:** `node test_supabase.js`
4. **Se funcionar, reiniciar o servidor:** `pm2 restart fps` ou reiniciar manualmente

## 💡 Nota Importante:

O plano **Free Tier** do Supabase requer uso do **Connection Pooler** (porta 6543) para conexões externas. A porta 5432 (conexão direta) geralmente só funciona para:
- Conexões locais durante desenvolvimento
- Planos pagos com acesso direto habilitado
- Uso do pgBouncer/Pooler

## 🔗 Documentação Útil:

- [Supabase Database Connection](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Troubleshooting Connections](https://supabase.com/docs/guides/platform/troubleshooting)
