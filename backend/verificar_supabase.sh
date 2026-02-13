#!/bin/bash

# Script de Verificação do Supabase PostgreSQL
echo "🔍 VERIFICAÇÃO DO SUPABASE POSTGRESQL"
echo "======================================"
echo ""

# Carregar variáveis de ambiente
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Arquivo .env não encontrado!"
    exit 1
fi

# Extrair componentes da DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📋 Configurações:"
echo "   Host: $DB_HOST"
echo "   Porta: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   Usuário: $DB_USER"
echo "   SSL: $PGSSL"
echo ""

# Verificar se psql está instalado
if ! command -v psql &> /dev/null; then
    echo "⚠️  psql não instalado. Instalando..."
    sudo apt-get update && sudo apt-get install -y postgresql-client
fi

echo "🔌 Testando conexão..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Conexão estabelecida com sucesso!"
    echo ""
else
    echo "❌ Falha na conexão!"
    echo ""
    exit 1
fi

echo "📊 Estatísticas do Banco:"
echo "------------------------"

# Total de transações
TOTAL_TRANS=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM transactions;" 2>/dev/null | xargs)
echo "   Total de transações: $TOTAL_TRANS"

# Transações por saúde
echo ""
echo "   Distribuição por status:"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    COALESCE(saude, 'NULL') as status,
    COUNT(*) as quantidade,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentual
FROM transactions
GROUP BY saude
ORDER BY quantidade DESC
LIMIT 10;
" 2>/dev/null

# Últimas sincronizações
echo ""
echo "🔄 Últimas Sincronizações:"
echo "-------------------------"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    TO_TIMESTAMP(last_sync/1000) as horario,
    total_records as registros,
    sync_status as status,
    COALESCE(error_message, 'OK') as mensagem
FROM sync_metadata
ORDER BY id DESC
LIMIT 5;
" 2>/dev/null

# Total de logs de pesquisa
TOTAL_LOGS=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM search_logs;" 2>/dev/null | xargs)
echo ""
echo "📝 Total de logs de pesquisa: $TOTAL_LOGS"

# Últimas transações
echo ""
echo "📌 Últimas 5 Transações:"
echo "-----------------------"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    TO_TIMESTAMP(horario/1000) as horario,
    SUBSTRING(url_resumida, 1, 50) as rota,
    saude,
    ra
FROM transactions
ORDER BY horario DESC
LIMIT 5;
" 2>/dev/null

echo ""
echo "✅ Verificação concluída!"
echo ""
echo "💡 Dicas:"
echo "   - Para conectar manualmente: PGPASSWORD='$DB_PASS' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
echo "   - Dashboard Supabase: https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm"
echo "   - Documentação completa em: GUIA_SUPABASE.md"
