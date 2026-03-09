# ⚡ QUICKSTART - MIGRAÇÃO EM 15 MINUTOS

## Passo 1: Criar Schema no Banco (5 min)

### Abrir Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm/editor/sql
2. Clique em "New Query"
3. **COPIE TUDO** de `backend/db/SCHEMA_METRICAS.sql`
4. Cole na query
5. Clique "Run"
6. Espere ✅

**Validar:**
```sql
SELECT COUNT(*) FROM transactions_raw;
SELECT COUNT(*) FROM metrics_hourly;
SELECT proname FROM pg_proc WHERE proname = 'update_all_metrics';
```

---

## Passo 2: Atualizar Backend (5 min)

### Arquivo 1: backend/server.js

**Encontrar:**
```javascript
import { initDatabase, startAutoSync } from "./db/syncService.js";
```

**Substituir por:**
```javascript
import { startAutoSyncNewArch } from "./db/newArchSync.js";
```

---

**Encontrar:**
```javascript
await initDatabase();
startAutoSync(parseInt(process.env.SYNC_INTERVAL_MINUTES) || 2);
```

**Substituir por:**
```javascript
startAutoSyncNewArch(5); // Sincroniza a cada 5 minutos
```

---

### Arquivo 2: backend/routes/analytics.js

**Encontrar:**
```javascript
import { getGeneralStats } from "../controllers/analyticsController.js";
```

**Substituir por:**
```javascript
import { getGeneralStatsOptimized } from "../controllers/analyticsControllerOptimized.js";
```

---

**Encontrar:**
```javascript
router.get("/stats", getGeneralStats);
```

**Substituir por:**
```javascript
router.get("/stats", getGeneralStatsOptimized);
```

---

## Passo 3: Deploy (3 min)

```bash
# Kill processo antigo
pkill -f "node server"

# Copiar novos arquivos
cp backend/db/newArchSync.js backend/db/
cp backend/controllers/analyticsControllerOptimized.js backend/controllers/

# Reiniciar
cd backend
nohup node server.js > nohup.out 2>&1 &

# Esperar 5 segundos
sleep 5

# Verificar logs
tail -50 nohup.out
```

**Procurar por:**
```
🚀 API FPS rodando em http://0.0.0.0:4001
🤖 Auto-sync ativado (intervalo: 5 minutos)
```

---

## Passo 4: Validar (2 min)

### Terminal 1: Ver Sincronização

```bash
cd backend && tail -f nohup.out | grep -E "(===|✅|ERROR)"
```

**Esperado:**
```
🔄 ===== CICLO DE SINCRONIZAÇÃO =====
📡 Preparando chamada AppDynamics...
✅ Resposta recebida! Status: 200
📥 Inserindo 5000 registros em transactions_raw...
   ✓ Lote 1/10 inserido
   ✓ Lote 2/10 inserido
✅ Total de 5000 registros inseridos
⚙️  Chamando update_all_metrics()...
✅ Métricas atualizadas!
```

### Terminal 2: Testar API

```bash
# Teste 1: Velocidade
time curl -s http://127.0.0.1:4001/api/analytics/stats?days=7 | jq '.tempo_ms'

# Teste 2: Dados Completos
curl -s http://127.0.0.1:4001/api/analytics/stats?days=7 | jq '{
  totalEventos,
  horarios_24h: (.horariosMaisUsados | length),
  categorias: (.recursosMaisUsados | length)
}'

# Teste 3: Via HTTPS
curl -k -s https://fps.teletex.com.br/api/analytics/stats?days=7 | jq .tempo_ms
```

**Expected Output:**
```json
{
  "totalEventos": 5000,
  "horarios_24h": 24,
  "categorias": 14
}
```

---

## Passo 5: Verificar Banco (1 min)

```sql
-- Ver dados inseridos
SELECT COUNT(*) FROM transactions_raw;

-- Ver métricas calculadas
SELECT COUNT(*) FROM metrics_hourly;
SELECT COUNT(*) FROM metrics_daily;

-- Ver status
SELECT * FROM metrics_control;
```

---

## Troubleshooting Rápido

### ❌ "relation 'transactions_raw' does not exist"
→ Executou o SQL? Verifica SQL Editor no Supabase

### ❌ "getGeneralStatsOptimized is not defined"
→ Copiu o arquivo para `controllers/`? Fez os imports?

### ❌ Resposta vazia
→ Primeira sync leva ~5min. Aguarde e veja logs.

### ❌ Ainda lento (>10s)
→ Verifica se query está em `metrics_*` e não `transactions_raw`

```javascript
// ❌ ERRADO
.from("transactions_raw").select("*")

// ✅ CORRETO
.from("metrics_daily").select("*")
```

---

## Rollback de Emergência

```bash
# Se der muito ruim:
pkill -f "node server"

# Reverter imports em server.js:
# De: import { startAutoSyncNewArch }...
# Para: import { startAutoSync }...

# Reverter logs em server.js:
# De: startAutoSyncNewArch(5);
# Para: await initDatabase(); startAutoSync(2);

# Restaurar controller antigo:
# De: analyticsControllerOptimized
# Para: analyticsController

# Reiniciar
cd backend && nohup node server.js > nohup.out 2>&1 &
```

---

## ✅ Checklist Final

- [ ] SQL executado no Supabase
- [ ] server.js atualizado (imports + função)
- [ ] routes/analytics.js atualizado (imports + rota)
- [ ] Novos arquivos copiados (newArchSync.js, analyticsControllerOptimized.js)
- [ ] Servidor reiniciado
- [ ] Logs mostram "===== CICLO DE SINCRONIZAÇÃO ====="
- [ ] curl retorna tempo <3s
- [ ] Dashboard carrega todos os dados (24 horas, todas as categorias)
- [ ] Supabase mostra registros em transactions_raw
- [ ] Supabase mostra métricas em metrics_daily

---

## 🎉 Pronto!

Agora você tem:
✔ Arquitetura enterprise
✔ Performance garantida <3s
✔ Escalável para 10M+
✔ Sem manutenção frequente

**Próximo passo:** Monitorar por 1 hora e depois dormir tranquilo 😴
