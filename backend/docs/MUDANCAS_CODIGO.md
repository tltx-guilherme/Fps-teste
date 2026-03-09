// ============================================================
// EXEMPLOS DE CÓDIGO - ATUALIZAÇÕES NECESSÁRIAS
// ============================================================
// Copie as mudanças indicadas para seus arquivos

// ============================================================
// 1. ARQUIVO: backend/server.js
// ============================================================

// ❌ REMOVER ESTAS LINHAS (antigas):
// import { startAutoSync } from './db/syncService.js';

// ✅ ADICIONAR ESTAS LINHAS (novas):
import { startAutoSyncNewArch } from './db/newArchSync.js';

// ... resto do código ...

// ❌ REMOVER ESTA CHAMADA (antiga):
// startAutoSync();

// ✅ ADICIONAR ESTA CHAMADA (nova):
startAutoSyncNewArch(5); // Sincroniza a cada 5 minutos

// Exemplo completo de server.js atualizado:
/*
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyticsRoutes from './routes/analytics.js';
import { startAutoSyncNewArch } from './db/newArchSync.js';  // ← MUDOU

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

app.use('/api/analytics', analyticsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startAutoSyncNewArch(5);  // ← MUDOU
});
*/

// ============================================================
// 2. ARQUIVO: backend/routes/analytics.js
// ============================================================

// ❌ REMOVER ESTAS LINHAS (antigas):
// import { getGeneralStats } from '../controllers/analyticsController.js';

// ✅ ADICIONAR ESTAS LINHAS (novas):
import { getGeneralStatsOptimized } from '../controllers/analyticsControllerOptimized.js';

// ❌ REMOVER ESTA ROTA (antiga):
// router.get('/stats', getGeneralStats);

// ✅ ADICIONAR ESTA ROTA (nova):
router.get('/stats', getGeneralStatsOptimized);

// Exemplo completo de routes/analytics.js atualizado:
/*
import express from 'express';
import { getGeneralStatsOptimized } from '../controllers/analyticsControllerOptimized.js';  // ← MUDOU

const router = express.Router();

router.get('/stats', getGeneralStatsOptimized);  // ← MUDOU

export default router;
*/

// ============================================================
// 3. ARQUIVOS A COPIAR (integralmente)
// ============================================================

// Copie estes 2 arquivos para os locais indicados:

// 1) backend/db/newArchSync.js
//    ← Arquivo implementa syncDatabaseNewArch() e startAutoSyncNewArch()

// 2) backend/controllers/analyticsControllerOptimized.js
//    ← Arquivo implementa getGeneralStatsOptimized()

// ============================================================
// 4. SEQUÊNCIA DE COMANDOS (terminal)
// ============================================================

/*
# 1. Pare o servidor antigo
pkill -f "node server"

# 2. Aguarde 2 segundos
sleep 2

# 3. Verifique se parou
ps aux | grep "node server" | grep -v grep

# 4. Inicie o novo servidor
cd /home/admin_django/projetos/fps/backend
nohup node server.js > nohup.out 2>&1 &

# 5. Aguarde inicialização
sleep 5

# 6. Veja os logs iniciais (procure por "CICLO DE SINCRONIZACIÓN")
tail -50 nohup.out

# 7. Teste a velocidade
time curl -s http://localhost:4001/api/analytics/stats?days=7 | jq '.tempo_ms'

# 8. Veja total de dados (esperado: múltiplos de 24)
curl -s http://localhost:4001/api/analytics/stats?days=7 | jq '.horariosMaisUsados | length'

# 9. Monitore logs em tempo real
tail -f nohup.out | grep -E "(===|✅|ERRO)"
*/

// ============================================================
// 5. VALIDAÇÃO POST-DEPLOY
// ============================================================

/*
// No banco (Supabase SQL):

-- Verificar se tem dados em transactions_raw
SELECT COUNT(*) as total_raw FROM transactions_raw;
-- Esperado: > 0

-- Verificar se metrics foram calculadas
SELECT COUNT(*) as total_hourly FROM metrics_hourly;
-- Esperado: > 0

-- Ver última atualização
SELECT MAX(updated_at) as ultima_atualizacao FROM metrics_control;
-- Esperado: recentemente (últimos 5 minutos)

-- Ver distribuição horária
SELECT hora, COUNT(*) as total FROM metrics_hourly 
GROUP BY hora ORDER BY hora;
-- Esperado: 24 linhas (0-23)
*/

// ============================================================
// 6. ROLLBACK (se algo der errado)
// ============================================================

/*
# Parar servidor novo
pkill -f "node server"

# Reestabelecer imports antigos em:
# - server.js (voltar para syncService)
# - routes/analytics.js (voltar para analyticsController)

# Iniciar servidor antigo
cd /home/admin_django/projetos/fps/backend
nohup node server.js > nohup.out 2>&1 &

# Testar
curl -s http://localhost:4001/api/analytics/stats?days=7 | jq .

# Se erro persiste, restaure backup do DB
# No Supabase: SQL Editor → Query antigo (se salvou)
*/

// ============================================================
// 7. RESUMO DAS MUDANÇAS
// ============================================================

/*
┌─────────────────────────────────────────────────────────┐
│ ARQUIVO          │ MUDANÇA                    │ PRIORIDADE │
├─────────────────────────────────────────────────────────┤
│ server.js        │ Atualizar importação     │ ⚠️  CRÍTICA │
│                  │ Atualizar startAutoSync  │           │
├─────────────────────────────────────────────────────────┤
│ routes/          │ Atualizar importação     │ ⚠️  CRÍTICA │
│ analytics.js     │ Atualizar rota handler   │           │
├─────────────────────────────────────────────────────────┤
│ db/              │ COPIAR newArchSync.js    │ ⚠️  CRÍTICA │
│                  │                          │           │
├─────────────────────────────────────────────────────────┤
│ controllers/     │ COPIAR Controller        │ ⚠️  CRÍTICA │
│                  │ Otimizado                │           │
├─────────────────────────────────────────────────────────┤
│ backend/         │ Executar SQL no Supabase │ ⚠️  CRÍTICA │
│ db/              │ (SCHEMA_METRICAS.sql)    │ (PRIMEIRO) │
│                  │                          │           │
└─────────────────────────────────────────────────────────┘

ORDEM CORRETA:
1. Executar SQL no Supabase (criar tabelas)
2. Copiar arquivos novos
3. Atualizar importações
4. Reiniciar servidor
5. Validar logs
6. Testar API
*/

export {};
