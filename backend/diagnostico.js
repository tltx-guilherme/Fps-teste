#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

console.log('🔍 DIAGNÓSTICO DETALHADO - SUPABASE');
console.log('=====================================\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function diagnostico() {
  console.log('📋 Testando acesso às tabelas...\n');
  
  const tables = ['transactions', 'search_logs', 'sync_metadata'];
  
  for (const table of tables) {
    console.log(`\n🔎 Testando tabela: ${table}`);
    console.log('─'.repeat(50));
    
    // Teste 1: Select simples
    const { data: selectData, error: selectError } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    console.log('SELECT:', selectError ? `❌ ${selectError.message} (code: ${selectError.code})` : `✅ OK - ${selectData?.length || 0} registros`);
    
    // Teste 2: Count
    const { count, error: countError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    console.log('COUNT:', countError ? `❌ ${countError.message} (code: ${countError.code})` : `✅ OK - ${count} registros`);
    
    // Teste 3: Insert (depois deletamos)
    const testData = table === 'transactions' 
      ? { url: 'test', horario: Date.now(), ra: 'test' }
      : table === 'search_logs'
      ? { ra: 'test', user_id: 'test' }
      : { last_sync: Date.now(), total_records: 0, sync_status: 'test' };
    
    const { data: insertData, error: insertError } = await supabase
      .from(table)
      .insert(testData)
      .select();
    
    console.log('INSERT:', insertError ? `❌ ${insertError.message} (code: ${insertError.code})` : `✅ OK - ID: ${insertData?.[0]?.id}`);
    
    if (insertData && insertData[0]?.id) {
      // Limpar teste
      await supabase.from(table).delete().eq('id', insertData[0].id);
    }
  }
  
  console.log('\n\n📊 DIAGNÓSTICO COMPLETO:\n');
  
  // Análise dos erros
  const { error: testError } = await supabase.from('transactions').select('*').limit(1);
  
  if (testError) {
    console.log('❌ PROBLEMA IDENTIFICADO:\n');
    
    if (testError.code === '42501' || testError.message.includes('permission denied')) {
      console.log('🔐 ERRO DE PERMISSÃO (RLS ATIVO)');
      console.log('\n✅ SOLUÇÃO:');
      console.log('Execute este SQL no Dashboard do Supabase:\n');
      console.log('-- Desabilitar RLS');
      console.log('ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE search_logs DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE sync_metadata DISABLE ROW LEVEL SECURITY;\n');
    } else if (testError.code === 'PGRST116' || testError.message.includes('not found')) {
      console.log('📋 TABELAS NÃO ENCONTRADAS');
      console.log('\n✅ SOLUÇÃO:');
      console.log('Execute o SQL do arquivo CRIAR_TABELAS.sql no Dashboard\n');
    } else if (testError.code === 'PGRST301' || testError.message.includes('JWT')) {
      console.log('🔑 PROBLEMA COM A API KEY');
      console.log('\n✅ SOLUÇÃO:');
      console.log('1. Acesse: https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm/settings/api');
      console.log('2. Copie a "anon public" key');
      console.log('3. Atualize SUPABASE_SERVICE_ROLE_KEY no .env\n');
    } else {
      console.log(`🤔 ERRO DESCONHECIDO: ${testError.message}`);
      console.log(`   Code: ${testError.code}`);
      console.log(`   Details:`, testError.details);
      console.log(`   Hint:`, testError.hint);
    }
  } else {
    console.log('✅ TUDO FUNCIONANDO CORRETAMENTE!\n');
  }
}

diagnostico();
