#!/usr/bin/env node

/**
 * Script Interativo - Configurar Chave do Supabase
 * Este script pede a chave JWT e configura automaticamente
 */

import readline from 'readline';
import { writeFileSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║           🔧 CONFIGURAÇÃO AUTOMÁTICA DO SUPABASE SDK                  ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

console.log('Este script vai configurar a chave JWT correta do Supabase.\n');

console.log('📋 Instruções:');
console.log('1. Acesse: https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm/settings/api');
console.log('2. Na seção "Project API keys", clique em [Copy] na chave "anon public"');
console.log('3. Cole a chave abaixo\n');

rl.question('🔑 Cole a chave JWT do Supabase aqui: ', async (key) => {
  const trimmedKey = key.trim();
  
  console.log('\n🔍 Validando chave...\n');
  
  // Validar formato
  if (!trimmedKey.startsWith('eyJ')) {
    console.log('❌ ERRO: A chave não começa com "eyJ"');
    console.log('   Chave fornecida começa com:', trimmedKey.substring(0, 20) + '...');
    console.log('\n❌ Esta não é uma chave JWT válida do Supabase!');
    console.log('\n💡 A chave correta deve:');
    console.log('   • Começar com: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    console.log('   • Ter cerca de 200-300 caracteres');
    console.log('   • Ter 3 partes separadas por pontos (.)\n');
    rl.close();
    process.exit(1);
  }
  
  if (trimmedKey.length < 100) {
    console.log('❌ ERRO: A chave é muito curta!');
    console.log(`   Tamanho da chave: ${trimmedKey.length} caracteres`);
    console.log('   Esperado: pelo menos 100 caracteres\n');
    rl.close();
    process.exit(1);
  }
  
  const parts = trimmedKey.split('.');
  if (parts.length !== 3) {
    console.log('❌ ERRO: JWT inválido!');
    console.log(`   Número de partes: ${parts.length}`);
    console.log('   Esperado: 3 partes separadas por ponto (.)\n');
    rl.close();
    process.exit(1);
  }
  
  console.log('✅ Formato da chave válido!');
  console.log(`   Tamanho: ${trimmedKey.length} caracteres`);
  console.log(`   Partes: ${parts.length}\n`);
  
  // Testar conexão
  console.log('🔌 Testando conexão com Supabase...\n');
  
  const supabase = createClient('https://jdwgrzkxpdehrprcxxhm.supabase.co', trimmedKey);
  
  try {
    const { error } = await supabase.from('transactions').select('id').limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️  Tabela não encontrada, mas chave está funcionando!');
        console.log('   (Execute o SQL do arquivo CRIAR_TABELAS.sql)\n');
      } else if (error.message.includes('Invalid API key')) {
        console.log('❌ A chave é inválida ou não tem permissões!');
        console.log('   Erro:', error.message);
        console.log('\n💡 Tente usar a chave "service_role secret" ao invés de "anon public"\n');
        rl.close();
        process.exit(1);
      } else {
        console.log('✅ Conexão estabelecida!');
        console.log('   (Alguns erros são esperados se as tabelas não existirem)\n');
      }
    } else {
      console.log('✅ Conexão estabelecida com sucesso!\n');
    }
  } catch (err) {
    console.log('❌ Erro ao testar conexão:', err.message, '\n');
    rl.close();
    process.exit(1);
  }
  
  // Atualizar .env
  console.log('📝 Atualizando arquivo .env...\n');
  
  try {
    let envContent = readFileSync('.env', 'utf8');
    
    // Remover linhas antigas de SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY
    envContent = envContent.split('\n').filter(line => {
      return !line.startsWith('SUPABASE_ANON_KEY=') && 
             !line.startsWith('SUPABASE_SERVICE_ROLE_KEY=');
    }).join('\n');
    
    // Adicionar nova chave
    if (!envContent.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
      const supabaseUrlLine = envContent.indexOf('SUPABASE_URL=');
      if (supabaseUrlLine !== -1) {
        const lines = envContent.split('\n');
        const urlLineIndex = lines.findIndex(l => l.startsWith('SUPABASE_URL='));
        lines.splice(urlLineIndex + 1, 0, `SUPABASE_SERVICE_ROLE_KEY=${trimmedKey}`);
        envContent = lines.join('\n');
      } else {
        envContent += `\nSUPABASE_SERVICE_ROLE_KEY=${trimmedKey}\n`;
      }
    }
    
    writeFileSync('.env', envContent);
    console.log('✅ Arquivo .env atualizado!\n');
  } catch (err) {
    console.log('❌ Erro ao atualizar .env:', err.message);
    console.log('\n📝 Adicione manualmente no .env:');
    console.log(`SUPABASE_SERVICE_ROLE_KEY=${trimmedKey}\n`);
  }
  
  // Atualizar arquivos JS
  console.log('📝 Atualizando arquivos do projeto...\n');
  
  const filesToUpdate = [
    'db/syncService.js',
    'test_supabase_sdk.js',
    'diagnostico.js'
  ];
  
  for (const file of filesToUpdate) {
    try {
      let content = readFileSync(file, 'utf8');
      if (content.includes('SUPABASE_ANON_KEY')) {
        content = content.replace(/SUPABASE_ANON_KEY/g, 'SUPABASE_SERVICE_ROLE_KEY');
        writeFileSync(file, content);
        console.log(`   ✅ ${file}`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${file}: ${err.message}`);
    }
  }
  
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║                   ✅ CONFIGURAÇÃO CONCLUÍDA!                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
  
  console.log('🧪 Testando agora...\n');
  
  // Testar novamente
  const { exec } = await import('child_process');
  exec('node diagnostico.js', (error, stdout, stderr) => {
    console.log(stdout);
    if (stderr) console.log(stderr);
    
    console.log('\n💡 Próximos passos:');
    console.log('   1. Se os testes passaram: npm start');
    console.log('   2. Se "tabelas não encontradas": Execute CRIAR_TABELAS.sql no dashboard');
    console.log('   3. Verifique o status: curl http://localhost:4001/api/sync/status\n');
    
    rl.close();
  });
});
