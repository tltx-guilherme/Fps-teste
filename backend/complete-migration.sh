#!/bin/bash

echo "🚀 Executando todos os passos da migração..."

# 1. Verificar se servidor está rodando
echo "📡 Verificando servidor..."
if ! curl -s http://localhost:4001/api/analytics/stats > /dev/null 2>&1; then
    echo "❌ Servidor não está rodando na porta 4001"
    echo "   Inicie com: cd backend && node server.js"
    exit 1
fi
echo "✅ Servidor rodando"

# 2. Importar dados via endpoint (se existir arquivo JSON)
if [ -f "sqlite-export.json" ]; then
    echo "📦 Importando dados do SQLite via API..."
    
    # Cria um script Node.js temporário para importar os dados
    cat > temp-import.js << 'EOF'
import fs from 'fs';
import axios from 'axios';

const data = JSON.parse(fs.readFileSync('sqlite-export.json', 'utf8'));

console.log(`📊 Dados carregados: ${data.totalRecords} registros`);
console.log(`   Transactions: ${data.transactions.length}`);
console.log(`   Search logs: ${data.searchLogs.length}`);
console.log(`   Sync metadata: ${data.syncMeta.length}`);

try {
    console.log('🔄 Enviando dados para API...');
    const response = await axios.post('http://localhost:4001/api/import-data', {
        transactions: data.transactions,
        searchLogs: data.searchLogs,
        syncMeta: data.syncMeta
    }, {
        timeout: 300000, // 5 minutes
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    console.log('✅ Importação via API concluída!');
    console.log('📊 Resultado:', response.data);
    
} catch (error) {
    console.error('❌ Erro na importação:', error.message);
    if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
    }
    process.exit(1);
}
EOF

    node temp-import.js
    rm -f temp-import.js
    
    echo "✅ Dados importados com sucesso"
else
    echo "⚠️  Arquivo sqlite-export.json não encontrado - pulando importação"
fi

# 3. Verificar status do banco
echo "🔍 Verificando status do banco..."
curl -s http://localhost:4001/api/sync/status | jq . 2>/dev/null || echo "Status obtido (sem json parser)"

# 4. Testar endpoint de estatísticas
echo "📊 Testando estatísticas..."
curl -s http://localhost:4001/api/stats/local?limit=10 | head -200

echo ""
echo "🎉 Migração concluída!"
echo ""
echo "📋 Endpoints disponíveis:"
echo "   - http://189.45.141.181:4001/api/analytics/stats"
echo "   - http://189.45.141.181:4001/api/stats/local"
echo "   - http://189.45.141.181:4001/api/sync/status"
echo ""
echo "🔄 Para iniciar sincronização:"
echo "   curl -X POST http://localhost:4001/api/start-sync"