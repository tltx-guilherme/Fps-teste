import 'dotenv/config';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import { initDatabase } from './db/syncService.js';

const SQLITE_PATH = '/home/admin_django/gui_RESTORED_20260119_183158/fps-teste/backend/db/analytics.db';

const pool = new Pool({
  ssl: { rejectUnauthorized: false },
  host: 'db.ubtwernbbbaismnwbrwr.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'UGmEPrdjCAU4exZm'
});

async function migrateSQLiteToPostgres() {
  console.log('🔄 Iniciando migração SQLite → PostgreSQL...');
  
  try {
    // Verifica se o arquivo SQLite existe
    const sqliteDb = new Database(SQLITE_PATH, { readonly: true });
    
    console.log('📊 Verificando estrutura do banco SQLite...');
    
    // Lista tabelas
    const tables = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('   Tabelas encontradas:', tables.map(t => t.name));
    
    // Inicializa PostgreSQL
    console.log('🗄️  Inicializando estrutura PostgreSQL...');
    await initDatabase();
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Migra tabela transactions
      if (tables.some(t => t.name === 'transactions')) {
        console.log('📦 Migrando tabela transactions...');
        const transactions = sqliteDb.prepare('SELECT * FROM transactions').all();
        console.log(`   Encontrados ${transactions.length} registros`);
        
        if (transactions.length > 0) {
          // Limpa dados antigos no PostgreSQL
          await client.query('DELETE FROM transactions');
          
          const chunkSize = 1000;
          for (let i = 0; i < transactions.length; i += chunkSize) {
            const chunk = transactions.slice(i, i + chunkSize);
            const values = [];
            const placeholders = chunk.map((t, idx) => {
              const base = idx * 8;
              values.push(
                t.url,
                t.url_resumida,
                t.horario,
                t.saude,
                t.error_code,
                t.ra,
                t.synced_at,
                t.created_at || t.horario || Date.now()
              );
              return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
            });

            const insertSql = `
              INSERT INTO transactions (url, url_resumida, horario, saude, error_code, ra, synced_at, created_at)
              VALUES ${placeholders.join(',')}
              ON CONFLICT (url, horario) DO NOTHING
            `;

            await client.query(insertSql, values);
            console.log(`   Inseridos ${i + chunk.length}/${transactions.length} registros`);
          }
        }
      }
      
      // Migra tabela search_logs
      if (tables.some(t => t.name === 'search_logs')) {
        console.log('📦 Migrando tabela search_logs...');
        const searchLogs = sqliteDb.prepare('SELECT * FROM search_logs').all();
        console.log(`   Encontrados ${searchLogs.length} registros`);
        
        if (searchLogs.length > 0) {
          // Limpa dados antigos no PostgreSQL
          await client.query('DELETE FROM search_logs');
          
          const chunkSize = 1000;
          for (let i = 0; i < searchLogs.length; i += chunkSize) {
            const chunk = searchLogs.slice(i, i + chunkSize);
            const values = [];
            const placeholders = chunk.map((s, idx) => {
              const base = idx * 4;
              // Converte timestamps de segundos para milissegundos se necessário
              const searchedAtMs = s.searched_at < 1e12 ? s.searched_at * 1000 : s.searched_at;
              values.push(
                s.ra,
                s.user_id,
                s.ip,
                searchedAtMs
              );
              return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
            });

            const insertSql = `
              INSERT INTO search_logs (ra, user_id, ip, searched_at)
              VALUES ${placeholders.join(',')}
            `;

            await client.query(insertSql, values);
            console.log(`   Inseridos ${i + chunk.length}/${searchLogs.length} registros`);
          }
        }
      }
      
      // Migra tabela sync_metadata
      if (tables.some(t => t.name === 'sync_metadata')) {
        console.log('📦 Migrando tabela sync_metadata...');
        const syncMeta = sqliteDb.prepare('SELECT * FROM sync_metadata ORDER BY id DESC LIMIT 1').get();
        
        if (syncMeta) {
          console.log('   Último status de sync:', syncMeta);
          await client.query('DELETE FROM sync_metadata');
          await client.query(
            'INSERT INTO sync_metadata (last_sync, total_records, sync_status, error_message) VALUES ($1, $2, $3, $4)',
            [syncMeta.last_sync, syncMeta.total_records, syncMeta.sync_status, syncMeta.error_message]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Verifica os dados migrados
      const transactionCount = await client.query('SELECT COUNT(*)::bigint as count FROM transactions');
      const searchLogCount = await client.query('SELECT COUNT(*)::bigint as count FROM search_logs');
      
      console.log('✅ Migração concluída!');
      console.log(`   Transactions: ${transactionCount.rows[0].count}`);
      console.log(`   Search logs: ${searchLogCount.rows[0].count}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
    sqliteDb.close();
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executa a migração
migrateSQLiteToPostgres()
  .then(() => {
    console.log('🎉 Migração finalizada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  });