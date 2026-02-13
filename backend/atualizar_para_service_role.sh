#!/bin/bash

echo "🔄 ATUALIZAR CÓDIGO PARA USAR SERVICE_ROLE_KEY"
echo "=============================================="
echo ""
echo "Este script atualiza o código para usar a SERVICE_ROLE_KEY"
echo "ao invés da ANON_KEY, garantindo permissões totais."
echo ""

# Verificar se SERVICE_ROLE_KEY está definida
if [ -f .env ]; then
    if grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env; then
        echo "✅ SUPABASE_SERVICE_ROLE_KEY encontrada no .env"
    else
        echo "❌ SUPABASE_SERVICE_ROLE_KEY não encontrada no .env!"
        echo ""
        echo "Por favor, adicione no .env:"
        echo "SUPABASE_SERVICE_ROLE_KEY=eyJ... (cole a chave do dashboard)"
        echo ""
        echo "Acesse: https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm/settings/api"
        echo "Copie a chave 'service_role secret'"
        echo ""
        exit 1
    fi
else
    echo "❌ Arquivo .env não encontrado!"
    exit 1
fi

echo ""
echo "📝 Atualizando db/syncService.js..."

# Backup
cp db/syncService.js db/syncService.js.backup_$(date +%Y%m%d_%H%M%S)

# Atualizar importação de variável
sed -i "s/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY/g" db/syncService.js

echo "✅ Arquivo atualizado!"
echo ""
echo "📝 Atualizando test_supabase_sdk.js..."

sed -i "s/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY/g" test_supabase_sdk.js

echo "✅ Teste atualizado!"
echo ""
echo "📝 Atualizando diagnostico.js..."

sed -i "s/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY/g" diagnostico.js

echo "✅ Diagnóstico atualizado!"
echo ""
echo "✅ ATUALIZAÇÃO CONCLUÍDA!"
echo ""
echo "🧪 Testando agora..."
echo ""

node diagnostico.js
