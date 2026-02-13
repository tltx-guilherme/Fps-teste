#!/usr/bin/env node

/**
 * Script de Teste de Conexão Supabase via Node.js
 * Este script testa a conexão usando o mesmo método que a aplicação usa
 */

import { config } from 'dotenv';
import { Pool } from 'pg';

// Carregar variáveis de ambiente
config();

const { DATABASE_URL, PGSSL } = process.env;

console.log('🔍 TESTE DE CONEXÃO SUPABASE VIA NODE.JS');
console.log('==========================================\n');

console.log('📋 Configurações:');
console.log(`   DATABASE_URL: ${DATABASE_URL ? 'Configurado ✓' : 'Não configurado ✗'}`);
console.log(`   SSL: ${PGSSL}\n`);

// Configurar pool
const useSsl = (PGSSL || '').toLowerCase() === 'true' || (DATABASE_URL || '').includes('supabase.co');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  try {
    console.log('🔌 Testando conexão...');
    
    // Teste 1: Conectar ao banco
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso!\n');
    
    // Teste 2: Verificar versão do PostgreSQL
    console.log('📊 Informações do Banco:');
    const versionResult = await client.query('SELECT version();');
    console.log(`   ${versionResult.rows[0].version.split(',')[0]}\n`);
    
    // Teste 3: Verificar tabelas
    console.log('📋 Tabelas existentes:');
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('   ⚠️  Nenhuma tabela encontrada. Execute initDatabase() primeiro.\n');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   • ${row.tablename}`);
      });
      console.log('');
    }
    
    // Teste 4: Contar registros em cada tabela
    console.log('📊 Estatísticas:');
    
    for (const table of ['transactions', 'search_logs', 'sync_metadata']) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table};`);
        console.log(`   ${table}: ${countResult.rows[0].count} registros`);
      } catch (err) {
        console.log(`   ${table}: Tabela não existe ou erro ao consultar`);
      }
    }
    console.log('');
    
    // Teste 5: Verificar última sincronização
    try {
      const syncResult = await client.query(`
        SELECT last_sync, total_records, sync_status, error_message
        FROM sync_metadata
        ORDER BY id DESC
        LIMIT 1;
      `);
      
      if (syncResult.rows.length > 0) {
        const sync = syncResult.rows[0];
        console.log('🔄 Última Sincronização:');
        console.log(`   Data: ${sync.last_sync ? new Date(Number(sync.last_sync)).toLocaleString('pt-BR') : 'N/A'}`);
        console.log(`   Total de registros: ${sync.total_records || 0}`);
        console.log(`   Status: ${sync.sync_status || 'N/A'}`);
        if (sync.error_message) {
          console.log(`   Erro: ${sync.error_message}`);
        }
        console.log('');
      }
    } catch (err) {
      console.log('🔄 Última Sincronização: Nenhuma encontrada\n');
    }
    
    // Teste 6: Verificar índices
    console.log('🔍 Índices na tabela transactions:');
    const indexesResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'transactions' AND schemaname = 'public';
    `);
    
    if (indexesResult.rows.length > 0) {
      indexesResult.rows.forEach(row => {
        console.log(`   • ${row.indexname}`);
      });
    } else {
      console.log('   ⚠️  Nenhum índice encontrado');
    }
    console.log('');
    
    // Teste 7: Últimas transações
    try {
      const transResult = await client.query(`
        SELECT url_resumida, horario, saude, ra
        FROM transactions
        ORDER BY horario DESC
        LIMIT 5;
      `);
      
      if (transResult.rows.length > 0) {
        console.log('📌 Últimas 5 Transações:');
        transResult.rows.forEach((row, idx) => {
          const data = new Date(Number(row.horario));
          console.log(`   ${idx + 1}. ${row.url_resumida?.substring(0, 40) || 'N/A'}`);
          console.log(`      Data: ${data.toLocaleString('pt-BR')}, Saúde: ${row.saude || 'N/A'}, RA: ${row.ra || 'N/A'}`);
        });
        console.log('');
      }
    } catch (err) {
      console.log('📌 Últimas Transações: Nenhuma encontrada\n');
    }
    
    client.release();
    
    console.log('✅ TODOS OS TESTES PASSARAM!\n');
    console.log('💡 Próximos passos:');
    console.log('   1. Se as tabelas não existem, inicie o servidor para criar automaticamente');
    console.log('   2. Teste a sincronização: curl -X POST http://localhost:4001/api/sync');
    console.log('   3. Verifique o status: curl http://localhost:4001/api/sync/status\n');
    
  } catch (error) {
    console.error('❌ ERRO NA CONEXÃO:', error.message);
    console.error('\n🔧 Possíveis soluções:');
    console.error('   1. Verificar se DATABASE_URL está correto no .env');
    console.error('   2. Verificar se PGSSL=true está configurado');
    console.error('   3. Verificar se o Supabase está online');
    console.error('   4. Verificar firewall/rede\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
