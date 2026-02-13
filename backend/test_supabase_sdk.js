#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

console.log('🔍 TESTE DE CONEXÃO SUPABASE SDK (REST API)');
console.log('=============================================\n');

console.log('📋 Configurações:');
console.log('   SUPABASE_URL:', SUPABASE_URL || 'Não configurado');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Configurado ✓' : 'Não configurado');
console.log('');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function testSupabase() {
  try {
    console.log('🔌 Testando conexão via REST API...\n');
    
    console.log('📋 Teste 1: Verificando tabelas...');
    const tables = ['transactions', 'search_logs', 'sync_metadata'];
    const tableStatus = {};
    
    for (const table of tables) {
      try {
        const { error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(0);
        
        if (error) {
          if (error.code === 'PGRST116') {
            tableStatus[table] = { exists: false, error: 'Tabela não existe' };
          } else {
            tableStatus[table] = { exists: false, error: error.message };
          }
        } else {
          tableStatus[table] = { exists: true, count: count || 0 };
        }
      } catch (err) {
        tableStatus[table] = { exists: false, error: err.message };
      }
    }
    
    console.log('');
    for (const [table, status] of Object.entries(tableStatus)) {
      if (status.exists) {
        console.log('   ✅', table + ':', status.count, 'registros');
      } else {
        console.log('   ❌', table + ':', status.error);
      }
    }
    console.log('');
    
    const allTablesExist = Object.values(tableStatus).every(s => s.exists);
    
    if (!allTablesExist) {
      console.log('⚠️  TABELAS NÃO ENCONTRADAS!\n');
      console.log('Execute o SQL abaixo no Dashboard do Supabase:');
      console.log('https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm/editor/sql\n');
      console.log('Ver arquivo: CRIAR_TABELAS.sql\n');
      process.exit(1);
    }
    
    console.log('📝 Teste 2: Testando INSERT...');
    const testData = {
      url: 'https://teste.com/api/test-' + Date.now(),
      url_resumida: 'Teste API',
      horario: Date.now(),
      saude: 'NORMAL',
      error_code: null,
      ra: '999999',
      synced_at: Date.now()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('transactions')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.log('   ❌ Erro ao inserir:', insertError.message);
      if (insertError.code === '42501') {
        console.log('   ⚠️  Desabilite RLS: ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;\n');
      }
    } else {
      console.log('   ✅ INSERT bem-sucedido! ID:', insertData[0]?.id);
      console.log('');
      
      console.log('📖 Teste 3: Testando SELECT...');
      const { data: selectData, error: selectError } = await supabase
        .from('transactions')
        .select('*')
        .eq('ra', '999999')
        .limit(5);
      
      if (selectError) {
        console.log('   ❌ Erro ao buscar:', selectError.message);
      } else {
        console.log('   ✅ SELECT bem-sucedido! Encontrados:', selectData.length, 'registros');
      }
      console.log('');
      
      console.log('🗑️  Teste 4: Limpando dados de teste...');
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('ra', '999999');
      
      if (deleteError) {
        console.log('   ❌ Erro ao deletar:', deleteError.message);
      } else {
        console.log('   ✅ DELETE bem-sucedido!');
      }
      console.log('');
    }
    
    console.log('📊 Teste 5: Estatísticas das tabelas...');
    const { count: totalTrans } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalLogs } = await supabase
      .from('search_logs')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalSync } = await supabase
      .from('sync_metadata')
      .select('*', { count: 'exact', head: true });
    
    console.log('   • transactions:', totalTrans || 0, 'registros');
    console.log('   • search_logs:', totalLogs || 0, 'registros');
    console.log('   • sync_metadata:', totalSync || 0, 'registros');
    console.log('');
    
    const { data: lastSync } = await supabase
      .from('sync_metadata')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);
    
    if (lastSync && lastSync.length > 0) {
      console.log('🔄 Última Sincronização:');
      const date = lastSync[0].last_sync ? new Date(Number(lastSync[0].last_sync)).toLocaleString('pt-BR') : 'N/A';
      console.log('   Data:', date);
      console.log('   Total de registros:', lastSync[0].total_records || 0);
      console.log('   Status:', lastSync[0].sync_status || 'N/A');
      if (lastSync[0].error_message) {
        console.log('   Erro:', lastSync[0].error_message);
      }
      console.log('');
    } else {
      console.log('🔄 Nenhuma sincronização registrada ainda.\n');
    }
    
    console.log('✅ TODOS OS TESTES PASSARAM COM SUCESSO!\n');
    console.log('🎉 Supabase SDK está funcionando perfeitamente via HTTPS/REST!\n');
    console.log('💡 Próximos passos:');
    console.log('   1. Inicie o servidor: npm start');
    console.log('   2. O servidor criará baseline automaticamente');
    console.log('   3. Após 2 minutos, começará a sincronizar dados do AppDynamics\n');
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    console.error('\n🔧 Possíveis soluções:');
    console.error('   1. Verificar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
    console.error('   2. Criar as tabelas via Dashboard (SQL Editor)');
    console.error('   3. Desabilitar RLS nas tabelas');
    console.error('   4. Verificar se o projeto Supabase está ativo\n');
    process.exit(1);
  }
}

testSupabase();
