import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const { 
  SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY,
  APPD_ANALYTICS_URL, 
  APPD_ACCOUNT_NAME, 
  APPD_API_KEY, 
  APPD_APPLICATION 
} = process.env;

// Criar cliente Supabase (usa HTTPS/REST - funciona em qualquer rede)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Credenciais AppDynamics
const APPDYNAMICS_CONFIG = {
  url: APPD_ANALYTICS_URL,
  accountName: APPD_ACCOUNT_NAME,
  apiKey: APPD_API_KEY,
  application: APPD_APPLICATION || 'Aluno Online',
};

// Inicializa o banco de dados
export async function initDatabase() {
  // Com Supabase SDK, as tabelas devem ser criadas via Dashboard ou Migration
  // Vamos verificar se as tabelas existem fazendo uma query simples
  try {
    console.log('🔍 Verificando tabelas no Supabase...');
    
    // Tenta fazer uma query simples para verificar se a tabela existe
    const { error: transError } = await supabase.from('transactions').select('id').limit(1);
    const { error: searchError } = await supabase.from('search_logs').select('id').limit(1);
    const { error: syncError } = await supabase.from('sync_metadata').select('id').limit(1);
    
    if (transError && transError.code === 'PGRST116') {
      console.log('⚠️  Tabela "transactions" não encontrada. Criando via SQL...');
      await createTablesViaSQL();
    } else if (transError) {
      throw transError;
    }
    
    console.log('✅ Banco de dados Supabase verificado e pronto!');
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error.message);
    console.log('📋 Por favor, crie as tabelas manualmente via Dashboard ou execute o SQL fornecido.');
  }
}

// Função auxiliar para criar tabelas via SQL (requer service_role ou RLS desabilitado)
async function createTablesViaSQL() {
  console.log('📝 Criando tabelas via SQL...');
  console.log('⚠️  ATENÇÃO: Execute o SQL do arquivo CRIAR_TABELAS.sql no Dashboard do Supabase:');
  console.log('   https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm/editor/sql');
}

// Registra auditoria de pesquisa por RA
export async function logSearchRA({ ra, userId, ip }) {
  try {
    const { error } = await supabase.from('search_logs').insert({
      ra: ra || null,
      user_id: userId || 'unknown',
      ip: ip || null,
      searched_at: Date.now()
    });
    
    if (error) {
      console.error('❌ Erro ao registrar log de pesquisa:', error.message);
    }
  } catch (error) {
    console.error('❌ Erro ao registrar log de pesquisa:', error.message);
  }
}

// Busca dados do AppDynamics
async function fetchFromAppDynamics(limit = 50000, sinceTimestamp = null) {
  const now = Date.now();
  if (!sinceTimestamp) {
    console.log('🛑 Primeira sync é baseline. Não puxando histórico antigo.');
    return { total: 0, results: [] };
  }
  const startTimestamp = sinceTimestamp - 5000;
  console.log('📡 Preparando chamada AppDynamics para eventos novos...');
  console.log(`   Início (com overlap): ${new Date(startTimestamp).toISOString()} | Agora: ${new Date(now).toISOString()}`);

  const query = {
    query: `SELECT segments.httpData.url, transactionName AS 'URL Resumida', eventTimestamp AS 'Horario da chamada', userExperience AS 'Saude da chamada', segments.errorList.errorCode AS 'Tipo de Erro' FROM transactions WHERE application = '${APPDYNAMICS_CONFIG.application}' AND eventTimestamp > ${startTimestamp} ORDER BY eventTimestamp DESC LIMIT ${limit}`
  };

  console.log(`   Query: ${query.query}`);

  try {
    console.log('   Enviando requisição...');
    const response = await axios.post(APPDYNAMICS_CONFIG.url, query, {
      headers: {
        'X-Events-API-AccountName': APPDYNAMICS_CONFIG.accountName,
        'X-Events-API-Key': APPDYNAMICS_CONFIG.apiKey,
        'Content-type': 'application/vnd.appd.events+json;v=2'
      },
      timeout: 60000
    });

    console.log(`✅ Resposta recebida! Status: ${response.status}`);

    const data = Array.isArray(response.data) ? response.data[0] : response.data;
    console.log(`   Total disponível: ${data?.total || 0}`);
    console.log(`   Resultados recebidos: ${data?.results?.length || 0}`);

    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar dados do AppDynamics:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data).substring(0, 500));
    }
    throw error;
  }
}

// Extrai RA da URL
function extractRA(url, urlResumida) {
  const combined = (url || urlResumida || '').toLowerCase();

  const patterns = [
    /ra[=/](\d+)/i,
    /aluno[=/](\d+)/i,
    /user[=/](\d+)/i,
    /id[=/](\d+)/i
  ];

  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// Sincroniza dados com o banco local
export async function syncDatabase(options = {}) {
  const { limit = 50000, force = false } = options;

  try {
    const { data: lastSyncData, error: syncError } = await supabase
      .from('sync_metadata')
      .select('last_sync')
      .order('id', { ascending: false })
      .limit(1);
    
    if (syncError && syncError.code !== 'PGRST116') {
      throw syncError;
    }

    const lastSync = lastSyncData?.[0]?.last_sync || null;
    const now = Date.now();

    if (!force && lastSync && (now - lastSync) < 5 * 60 * 1000) {
      console.log('⏭️  Sincronização recente, pulando...');
      return { skipped: true, message: 'Sincronizado recentemente' };
    }

    console.log('🔄 Iniciando sincronização incremental...');
    console.log(`   Parâmetros: limit=${limit}`);
    console.log(`   Última sync: ${lastSync ? new Date(lastSync).toISOString() : 'Nenhuma (baseline)'}`);

    if (!lastSync) {
      await supabase.from('sync_metadata').insert({
        last_sync: now,
        total_records: 0,
        sync_status: 'baseline',
        error_message: null
      });
      console.log('✅ Baseline criada. Dados antigos ignorados. Aguarde próxima execução para começar a coletar.');
      return { success: true, baseline: true, newRecords: 0, totalRecords: 0 };
    }

    
    const data = await fetchFromAppDynamics(limit, lastSync);
    const rows = data?.results || [];

    console.log(`📥 Recebidos ${rows.length} registros do AppDynamics`);

    if (rows.length === 0) {
      console.log('⚠️  Nenhum evento novo desde a última execução');
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });
      
      await supabase.from('sync_metadata').insert({
        last_sync: now,
        total_records: count || 0,
        sync_status: 'success',
        error_message: 'Sem novos eventos'
      });
      return { success: true, newRecords: 0, totalRecords: count || 0, message: 'Sem novos eventos' };
    }

    const processedData = rows.map(r => {
      const fullUrls = r[0] || [];
      const primaryUrl = fullUrls[0] || null;
      let horarioTimestamp = r[2];
      if (typeof horarioTimestamp === 'string') {
        horarioTimestamp = new Date(horarioTimestamp).getTime();
      }
      return {
        url: primaryUrl,
        url_resumida: r[1] || null,
        horario: horarioTimestamp || null,
        saude: (r[3] || '').toUpperCase(),
        error_code: (r[4] || []).filter(Boolean).join(',') || null,
        ra: extractRA(primaryUrl, r[1]),
        synced_at: now
      };
    });

    console.log(`🔧 Processando ${processedData.length} registros...`);
    if (processedData[0]) {
      console.log(`   Exemplo: ${JSON.stringify(processedData[0])}`);
    }

    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .lt('horario', oneYearAgo);
    
    if (deleteError) {
      console.warn('⚠️  Erro ao limpar dados antigos:', deleteError.message);
    } else {
      console.log('🗑️  Dados mais antigos que 1 ano foram removidos');
    }

    const chunkSize = 1000;
    let insertedCount = 0;
    
    for (let i = 0; i < processedData.length; i += chunkSize) {
      const chunk = processedData.slice(i, i + chunkSize);
      
      const { error: insertError } = await supabase
        .from('transactions')
        .upsert(chunk, { 
          onConflict: 'url,horario',
          ignoreDuplicates: true 
        });
      
      if (insertError) {
        console.error(`❌ Erro ao inserir lote ${i / chunkSize + 1}:`, insertError.message);
      } else {
        insertedCount += chunk.length;
        console.log(`✅ Lote ${i / chunkSize + 1}/${Math.ceil(processedData.length / chunkSize)} inserido`);
      }
    }

    const { count: totalRecords } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    await supabase.from('sync_metadata').insert({
      last_sync: now,
      total_records: totalRecords || 0,
      sync_status: 'success',
      error_message: null
    });

    console.log(`✅ Sincronização concluída! ${rows.length} novos registros, total: ${totalRecords}`);

    return {
      success: true,
      newRecords: rows.length,
      totalRecords: totalRecords || 0,
      timestamp: now
    };
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    await supabase.from('sync_metadata').insert({
      last_sync: Date.now(),
      total_records: 0,
      sync_status: 'error',
      error_message: error.message
    });
    throw error;
  }
}

// Query helper para buscar dados locais
export async function queryLocal(tableName, filters = {}) {
  try {
    let query = supabase.from(tableName).select('*');
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        query = query.eq(key, value);
      }
    });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao consultar dados:', error.message);
    return [];
  }
}

// Busca search_logs com filtros via Supabase SDK (substitui SQL raw)
export async function getSearchLogsDB(options = {}) {
  const { ra, userId, start, end, limit = 100, offset = 0, order = 'desc' } = options;

  try {
    let query = supabase
      .from('search_logs')
      .select('id, ra, user_id, ip, searched_at', { count: 'exact' });

    if (ra) query = query.eq('ra', String(ra));
    if (userId) query = query.eq('user_id', String(userId));
    if (start) query = query.gte('searched_at', start);
    if (end) query = query.lte('searched_at', end);

    query = query.order('searched_at', { ascending: order === 'asc' });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // Converte searched_at (ms) para ISO string para exibição
    const rows = (data || []).map(r => ({
      ...r,
      searched_at: r.searched_at ? new Date(r.searched_at).toISOString() : null
    }));

    return { rows, total: count || 0 };
  } catch (error) {
    console.error('❌ Erro ao buscar search_logs:', error.message);
    return { rows: [], total: 0 };
  }
}

// Exporta todos os search_logs (para CSV) via Supabase SDK
export async function getAllSearchLogsDB(options = {}) {
  const { ra, userId, start, end, order = 'desc' } = options;

  try {
    let query = supabase
      .from('search_logs')
      .select('ra, user_id, ip, searched_at');

    if (ra) query = query.eq('ra', String(ra));
    if (userId) query = query.eq('user_id', String(userId));
    if (start) query = query.gte('searched_at', start);
    if (end) query = query.lte('searched_at', end);

    query = query.order('searched_at', { ascending: order === 'asc' });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(r => ({
      ...r,
      searched_at: r.searched_at ? new Date(r.searched_at).toISOString() : null
    }));
  } catch (error) {
    console.error('❌ Erro ao exportar search_logs:', error.message);
    return [];
  }
}

// Busca estatísticas do banco local
export async function getLocalStats(options = {}) {
  const { limit = 100000, daysAgo = 7, ra = null } = options;
  const now = Date.now();
  const startTimestamp = now - (daysAgo * 24 * 60 * 60 * 1000);

  try {
    const maxRows = 500000;
    const pageSize = 1000;
    const normalizedLimit = (limit === 'all' || limit === null)
      ? null
      : Math.max(0, Number(limit) || 0);
    const target = normalizedLimit === null ? maxRows : Math.min(normalizedLimit, maxRows);

    if (target === 0) return [];

    let results = [];
    let offset = 0;

    while (results.length < target) {
      let query = supabase
        .from('transactions')
        .select('url, url_resumida, horario, saude, error_code')
        .gte('horario', startTimestamp)
        .order('horario', { ascending: false });

      if (ra) {
        query = query.eq('ra', ra);
      }

      const remaining = target - results.length;
      const to = offset + Math.min(pageSize, remaining) - 1;

      const { data, error } = await query.range(offset, to);
      if (error) throw error;

      if (!data || data.length === 0) break;
      results = results.concat(data);

      if (data.length < (to - offset + 1)) break;
      offset += data.length;
    }

    return results;
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error.message);
    return [];
  }
}

// Busca último status de sincronização
export async function getSyncStatus() {
  try {
    const { data: statusData, error: statusError } = await supabase
      .from('sync_metadata')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);
    
    if (statusError) throw statusError;
    
    const status = statusData?.[0] || null;
    
    const { count: totalRecords } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    return { ...status, currentRecords: totalRecords || 0 };
  } catch (error) {
    console.error('❌ Erro ao buscar status:', error.message);
    return { currentRecords: 0 };
  }
}

// Scheduler automático (roda a cada X minutos)
export function startAutoSync(intervalMinutes = 2) {
  console.log(`🤖 Auto-sync ativado (intervalo: ${intervalMinutes} minutos)`);
  console.log('📌 Modo: coleta apenas eventos futuros (sem histórico)');
  console.log('🌐 Usando Supabase SDK via HTTPS/REST (funciona em qualquer rede)');

  setTimeout(() => {
    syncDatabase({ limit: 50000 }).catch(console.error);
  }, 3000);

  setInterval(() => {
    console.log('⏰ Verificando novos eventos...');
    syncDatabase({ limit: 50000 }).catch(console.error);
  }, intervalMinutes * 60 * 1000);
}
