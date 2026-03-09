// ============================================================================
// NOVO FLUXO DE INGESTÃO - ARQUITETURA ESCALÁVEL
// ============================================================================
// Insere em transactions_raw (particionada) e chama update_all_metrics()
// Substitui startAutoSync() do syncService.js para o fluxo de sync
// ============================================================================

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const APPD_APPLICATION = process.env.APPD_APPLICATION || 'Aluno Online';

// ============================================================================
// 1. BUSCAR DO APPDYNAMICS
// ============================================================================

async function fetchFromAppDynamics(limit = 5000, sinceTimestamp = null) {
  const now = Date.now();
  if (!sinceTimestamp) {
    console.log('🛑 Primeira sync é baseline. Não puxando histórico antigo.');
    return { total: 0, results: [] };
  }

  const startTimestamp = sinceTimestamp - 5000; // 5s overlap para não perder eventos
  console.log(`📡 [NewArch] Buscando AppDynamics...`);
  console.log(`   Desde: ${new Date(startTimestamp).toISOString()} | Agora: ${new Date(now).toISOString()}`);

  const query = {
    query: `SELECT segments.httpData.url, transactionName AS 'URL Resumida', eventTimestamp AS 'Horario da chamada', userExperience AS 'Saude da chamada', segments.errorList.errorCode AS 'Tipo de Erro' FROM transactions WHERE application = '${APPD_APPLICATION}' AND eventTimestamp > ${startTimestamp} ORDER BY eventTimestamp DESC LIMIT ${limit}`
  };

  try {
    const response = await axios.post(process.env.APPD_ANALYTICS_URL, query, {
      headers: {
        'X-Events-API-AccountName': process.env.APPD_ACCOUNT_NAME,
        'X-Events-API-Key': process.env.APPD_API_KEY,
        'Content-type': 'application/vnd.appd.events+json;v=2'
      },
      timeout: 60000
    });

    const data = Array.isArray(response.data) ? response.data[0] : response.data;
    console.log(`✅ AppDynamics: ${data?.results?.length || 0} registros (total disponível: ${data?.total || 0})`);
    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar AppDynamics:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
    }
    throw error;
  }
}

// ============================================================================
// 2. EXTRAIR RA DA URL
// ============================================================================

function extractRA(url, urlResumida) {
  const combined = (url || urlResumida || '').toLowerCase();
  const patterns = [/ra[=/](\d+)/i, /aluno[=/](\d+)/i, /user[=/](\d+)/i, /id[=/](\d+)/i];
  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ============================================================================
// 3. INSERIR EM TRANSACTIONS_RAW
// ============================================================================

async function insertIntoTransactionsRaw(records) {
  if (!records || records.length === 0) {
    console.log('⚠️  Nenhum registro para inserir');
    return 0;
  }

  const formatted = records.map(r => {
    const urls = r[0] || [];
    const urlResumida = r[1] || '';
    const horario = r[2];
    const saude = (r[3] || '').toUpperCase();
    const erros = r[4] || [];

    return {
      url: urls[0] || null,
      url_resumida: urlResumida || null,
      horario: new Date(horario).toISOString(),
      saude: saude || 'NORMAL',
      error_code: erros.filter(Boolean).length > 0 ? erros.filter(Boolean) : null,  // TEXT[] array
      ra: extractRA(urls[0], urlResumida)
    };
  });

  // Filtrar registros com horário inválido
  const valid = formatted.filter(r => r.horario && r.horario !== 'Invalid Date');
  if (valid.length !== formatted.length) {
    console.log(`⚠️  ${formatted.length - valid.length} registros com horário inválido descartados`);
  }

  console.log(`📥 Inserindo ${valid.length} registros em transactions_raw...`);

  const loteSize = 500;
  let totalInseridos = 0;

  for (let i = 0; i < valid.length; i += loteSize) {
    const lote = valid.slice(i, i + loteSize);
    const loteNum = Math.floor(i / loteSize) + 1;
    const totalLotes = Math.ceil(valid.length / loteSize);

    const { error } = await supabase.from('transactions_raw').insert(lote);

    if (error) {
      console.error(`❌ Erro lote ${loteNum}/${totalLotes}:`, error.message);
      continue; // Continua com próximos lotes
    }
    totalInseridos += lote.length;
    console.log(`   ✓ Lote ${loteNum}/${totalLotes} ok`);
  }

  console.log(`✅ ${totalInseridos}/${valid.length} registros inseridos em transactions_raw`);
  return totalInseridos;
}

// ============================================================================
// 4. CHAMAR update_all_metrics() RPC
// ============================================================================

async function callUpdateMetrics() {
  console.log('⚙️  Chamando update_all_metrics()...');

  const { error } = await supabase.rpc('update_all_metrics');

  if (error) {
    console.error('❌ Erro ao atualizar métricas:', error.message);
    throw error;
  }

  console.log('✅ Métricas agregadas (hourly/daily/monthly) atualizadas!');
}

// ============================================================================
// 5. FLUXO PRINCIPAL DE SINCRONIZAÇÃO
// ============================================================================

export async function syncDatabaseNewArch(options = {}) {
  const { limit = 5000 } = options;

  try {
    console.log('\n🔄 ===== CICLO DE SINCRONIZAÇÃO (Nova Arquitetura) =====');

    // Ler last_processed da tabela metrics_control (id=1)
    const { data: control, error: controlError } = await supabase
      .from('metrics_control')
      .select('last_processed')
      .eq('id', 1)
      .single();

    if (controlError) {
      console.error('❌ Erro ao ler metrics_control:', controlError.message);
      // Se não existe, criar baseline
      console.log('📝 Criando baseline em metrics_control...');
      await supabase
        .from('metrics_control')
        .upsert({ id: 1, last_processed: new Date().toISOString() });
      return { success: true, baseline: true };
    }

    const lastProcessedMs = new Date(control.last_processed).getTime();
    const now = Date.now();
    const elapsedSec = Math.floor((now - lastProcessedMs) / 1000);

    console.log(`⏰ Última processada: ${control.last_processed} (${elapsedSec}s atrás)`);

    // 1️⃣ Buscar do AppDynamics (desde last_processed)
    const appDynamicsData = await fetchFromAppDynamics(limit, lastProcessedMs);

    if (!appDynamicsData?.results || appDynamicsData.results.length === 0) {
      console.log('ℹ️  Nenhum novo dado do AppDynamics');
      return { success: true, recordsInserted: 0 };
    }

    // 2️⃣ Inserir em transactions_raw
    const inserted = await insertIntoTransactionsRaw(appDynamicsData.results);

    // 3️⃣ Chamar update_all_metrics() para reagregar (só se inseriu algo)
    if (inserted > 0) {
      await callUpdateMetrics();
      
      // Atualizar last_processed em metrics_control
      await supabase
        .from('metrics_control')
        .update({ last_processed: new Date().toISOString() })
        .eq('id', 1);
    }

    console.log(`\n✅ SINCRONIZAÇÃO CONCLUÍDA: ${inserted} registros inseridos e métricas atualizadas\n`);
    return { success: true, recordsInserted: inserted };

  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 6. SCHEDULER AUTOMÁTICO
// ============================================================================

export function startAutoSyncNewArch(intervalMinutes = 5) {
  console.log(`🤖 [NewArch] Auto-sync ativado (a cada ${intervalMinutes} min)`);
  console.log('📌 Fluxo: AppDynamics → transactions_raw → update_all_metrics()');

  // Primeira execução após 5 segundos
  setTimeout(() => {
    syncDatabaseNewArch({ limit: 5000 }).catch(err =>
      console.error('❌ Sync inicial falhou:', err.message)
    );
  }, 5000);

  // Repetir a cada X minutos
  setInterval(() => {
    syncDatabaseNewArch({ limit: 5000 }).catch(err =>
      console.error('❌ Sync periódica falhou:', err.message)
    );
  }, intervalMinutes * 60 * 1000);
}

// ============================================================================
// FIM DO NOVO FLUXO
// ============================================================================
