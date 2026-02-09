import Database from 'better-sqlite3';
import fs from 'fs';

const SQLITE_PATH = '/home/admin_django/gui_RESTORED_20260119_183158/fps-teste/backend/db/analytics.db';

console.log('📊 Extraindo dados do SQLite para JSON...');

try {
  const sqliteDb = new Database(SQLITE_PATH, { readonly: true });
  
  console.log('📦 Lendo tabela transactions...');
  const transactions = sqliteDb.prepare('SELECT * FROM transactions').all();
  console.log(`   Encontrados ${transactions.length} registros`);
  
  console.log('📦 Lendo tabela search_logs...');
  const searchLogs = sqliteDb.prepare('SELECT * FROM search_logs').all();
  console.log(`   Encontrados ${searchLogs.length} registros`);
  
  console.log('📦 Lendo tabela sync_metadata...');
  const syncMeta = sqliteDb.prepare('SELECT * FROM sync_metadata ORDER BY id DESC LIMIT 1').all();
  console.log(`   Encontrados ${syncMeta.length} registros`);
  
  const exportData = {
    transactions,
    searchLogs,
    syncMeta,
    exportedAt: new Date().toISOString(),
    totalRecords: transactions.length + searchLogs.length + syncMeta.length
  };
  
  fs.writeFileSync('sqlite-export.json', JSON.stringify(exportData, null, 2));
  
  console.log('✅ Dados exportados para sqlite-export.json');
  console.log(`   Total de registros: ${exportData.totalRecords}`);
  
  sqliteDb.close();
  
} catch (error) {
  console.error('❌ Erro na exportação:', error);
  process.exit(1);
}