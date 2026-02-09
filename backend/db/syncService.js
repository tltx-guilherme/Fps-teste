import Database from 'better-sqlite3';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'analytics.db');

// Credenciais AppDynamics
const APPDYNAMICS_CONFIG = {
  url: 'https://gru-ana-api.saas.appdynamics.com/events/query',
  accountName: 'fpsfaculdadepernambucanadesaude-prod_0d1c5bc4-c49d-46f0-b64a-59368a4fba07',
  apiKey: '109beedf-e770-43f4-9611-02e5c6ebece0',
  application: 'Aluno Online'
};

// Inicializa o banco de dados
export function initDatabase() {
  const db = new Database(DB_PATH);
  
  // Cria tabela de transações
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT,
      url_resumida TEXT,
      horario INTEGER,
      saude TEXT,
      error_code TEXT,
      ra TEXT,
      synced_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);
  
  // Tabela para auditoria de pesquisas por RA
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ra TEXT NOT NULL,
      user_id TEXT NOT NULL,
      ip TEXT,
      searched_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_search_ra ON search_logs(ra);
    CREATE INDEX IF NOT EXISTS idx_search_user ON search_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_search_time ON search_logs(searched_at);
  `);
  
  // Índices para otimizar queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ra ON transactions(ra);
    CREATE INDEX IF NOT EXISTS idx_horario ON transactions(horario);
    CREATE INDEX IF NOT EXISTS idx_saude ON transactions(saude);
    CREATE INDEX IF NOT EXISTS idx_synced_at ON transactions(synced_at);
    -- Evita duplicados do mesmo URL/horario
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_event ON transactions(url, horario);
  `);
  
  // Tabela de metadados de sincronização
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_sync INTEGER,
      total_records INTEGER,
      sync_status TEXT,
      error_message TEXT
    );
  `);
  
  console.log('✅ Banco de dados SQLite inicializado:', DB_PATH);
  db.close();
  return DB_PATH;
}

// Registra auditoria de pesquisa por RA
export function logSearchRA({ ra, userId, ip }) {
  const db = new Database(DB_PATH);
  try {
    const stmt = db.prepare(`
      INSERT INTO search_logs (ra, user_id, ip, searched_at)
      VALUES (?, ?, ?, strftime('%s','now'))
    `);
    stmt.run(ra || null, userId || 'unknown', ip || null);
  } finally {
    db.close();
  }
}

// Busca dados do AppDynamics
async function fetchFromAppDynamics(limit = 50000, sinceTimestamp = null) {
  const now = Date.now();
  // Se não há timestamp (primeira sincronização baseline), NÃO buscamos histórico
  if (!sinceTimestamp) {
    console.log('🛑 Primeira sync é baseline. Não puxando histórico antigo.');
    return { total: 0, results: [] };
  }
  // Pequeno overlap de 5 segundos para evitar perda de eventos limítrofes
  const startTimestamp = sinceTimestamp - 5000;
  console.log('📡 Preparando chamada AppDynamics para eventos novos...');
  console.log(`   Início (com overlap): ${new Date(startTimestamp).toISOString()} | Agora: ${new Date(now).toISOString()}`);
  
  const query = {
    query: `SELECT segments.httpData.url, transactionName AS 'URL Resumida', eventTimestamp AS 'Horário da chamada', userExperience AS 'Saúde da chamada', segments.errorList.errorCode AS 'Tipo de Erro' FROM transactions WHERE application = '${APPDYNAMICS_CONFIG.application}' AND eventTimestamp > ${startTimestamp} ORDER BY eventTimestamp DESC LIMIT ${limit}`
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
      timeout: 60000 // 60 segundos
    });

    console.log(`✅ Resposta recebida! Status: ${response.status}`);
    
    // AppDynamics retorna um array com objeto contendo results
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
  
  // Padrões comuns de RA
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
  const db = new Database(DB_PATH);
  
  try {
    // Verifica última sincronização
    const lastSync = db.prepare('SELECT last_sync FROM sync_metadata ORDER BY id DESC LIMIT 1').get();
    const now = Date.now();
    
    // Se sincronizou há menos de 5 minutos e não é forçado, pula
    if (!force && lastSync && (now - lastSync.last_sync) < 5 * 60 * 1000) {
      console.log('⏭️  Sincronização recente, pulando...');
      db.close();
      return { skipped: true, message: 'Sincronizado recentemente' };
    }
    
    console.log('🔄 Iniciando sincronização incremental...');
    console.log(`   Parâmetros: limit=${limit}`);
    console.log(`   Última sync: ${lastSync ? new Date(lastSync.last_sync).toISOString() : 'Nenhuma (baseline)'}`);
    
    // Se não há lastSync, criamos baseline e não populamos histórico
    if (!lastSync) {
      db.prepare(`INSERT INTO sync_metadata (last_sync, total_records, sync_status, error_message) VALUES (?, ?, ?, ?)`)
        .run(now, 0, 'baseline', null);
      console.log('✅ Baseline criada. Dados antigos ignorados. Aguarde próxima execução para começar a coletar.');
      db.close();
      return { success: true, baseline: true, newRecords: 0, totalRecords: 0 };
    }
    
    // Busca eventos APÓS última sincronização
    const data = await fetchFromAppDynamics(limit, lastSync.last_sync);
    
    const rows = data?.results || [];
    
    console.log(`📥 Recebidos ${rows.length} registros do AppDynamics`);
    
    if (rows.length === 0) {
      console.log('⚠️  Nenhum evento novo desde a última execução');
      const totalRecords = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
      db.prepare(`INSERT INTO sync_metadata (last_sync, total_records, sync_status, error_message) VALUES (?, ?, ?, ?)`)
        .run(now, totalRecords, 'success', 'Sem novos eventos');
      db.close();
      return { success: true, newRecords: 0, totalRecords, message: 'Sem novos eventos' };
    }
    
    // Limpa dados antigos - mantém histórico de 1 ano (365 dias)
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    const deleted = db.prepare('DELETE FROM transactions WHERE horario < ?').run(oneYearAgo);
    if (deleted.changes > 0) {
      console.log(`🗑️  Removidos ${deleted.changes} registros com mais de 1 ano`);
    }
    
    // Insere novos dados (ignora duplicados)
    const insert = db.prepare(`
      INSERT OR IGNORE INTO transactions (url, url_resumida, horario, saude, error_code, ra, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((transactions) => {
      for (const t of transactions) {
        insert.run(
          t.url,
          t.url_resumida,
          t.horario,
          t.saude,
          t.error_code,
          t.ra,
          now
        );
      }
    });
    
    // Processa e insere dados
    const processedData = rows.map(r => {
      const fullUrls = r[0] || [];
      const primaryUrl = fullUrls[0] || null;
      // r[2] vem como string ISO ou timestamp - normalizar para timestamp em ms
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
        ra: extractRA(primaryUrl, r[1])
      };
    });
    
    console.log(`🔧 Processando ${processedData.length} registros...`);
    console.log(`   Exemplo: ${JSON.stringify(processedData[0])}`);
    
    insertMany(processedData);
    
    // Atualiza metadados
    const totalRecords = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
    db.prepare(`
      INSERT INTO sync_metadata (last_sync, total_records, sync_status, error_message)
      VALUES (?, ?, ?, ?)
    `).run(now, totalRecords, 'success', null);
    
    console.log(`✅ Sincronização concluída! ${rows.length} novos registros, total: ${totalRecords}`);
    
    db.close();
    return {
      success: true,
      newRecords: rows.length,
      totalRecords,
      timestamp: now
    };
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    
    // Registra erro
    db.prepare(`
      INSERT INTO sync_metadata (last_sync, total_records, sync_status, error_message)
      VALUES (?, ?, ?, ?)
    `).run(Date.now(), 0, 'error', error.message);
    
    db.close();
    throw error;
  }
}

// Query helper para buscar dados locais
export function queryLocal(sqlQuery, params = []) {
  const db = new Database(DB_PATH);
  try {
    const results = db.prepare(sqlQuery).all(...params);
    db.close();
    return results;
  } catch (error) {
    db.close();
    throw error;
  }
}

// Busca estatísticas do banco local
export function getLocalStats(options = {}) {
  const { limit = 100000, daysAgo = 7, ra = null } = options;
  const db = new Database(DB_PATH);
  
  try {
    const now = Date.now();
    const startTimestamp = now - (daysAgo * 24 * 60 * 60 * 1000);
    
    let whereClause = 'WHERE horario >= ?';
    let params = [startTimestamp];
    
    if (ra) {
      whereClause += ' AND ra = ?';
      params.push(ra);
    }
    
    let query = `
      SELECT url, url_resumida, horario, saude, error_code
      FROM transactions
      ${whereClause}
    `;
    // Se limit for null ou 'all', não aplica LIMIT
    if (limit !== null && limit !== 'all') {
      query += ` LIMIT ?`;
      params.push(limit);
    }
    
    const results = db.prepare(query).all(...params);
    db.close();
    
    return results;
  } catch (error) {
    db.close();
    throw error;
  }
}

// Busca último status de sincronização
export function getSyncStatus() {
  const db = new Database(DB_PATH);
  try {
    const status = db.prepare(`
      SELECT * FROM sync_metadata ORDER BY id DESC LIMIT 1
    `).get();
    
    const totalRecords = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
    
    db.close();
    return { ...status, currentRecords: totalRecords };
  } catch (error) {
    db.close();
    throw error;
  }
}

// Scheduler automático (roda a cada X minutos)
export function startAutoSync(intervalMinutes = 2) {
  console.log(`🤖 Auto-sync ativado (intervalo: ${intervalMinutes} minutos)`);
  console.log('📌 Modo: coleta apenas eventos futuros (sem histórico)');
  
  // Baseline rápida
  setTimeout(() => {
    syncDatabase({ limit: 50000 }).catch(console.error);
  }, 3000);
  
  setInterval(() => {
    console.log('⏰ Verificando novos eventos...');
    syncDatabase({ limit: 50000 }).catch(console.error);
  }, intervalMinutes * 60 * 1000);
}
