#!/bin/bash

# Script para migrar dados via dump SQL
export_sqlite_to_sql() {
  echo "📊 Criando dump SQL do SQLite..."
  
  # Exporta dados para SQL
  sqlite3 /home/admin_django/gui_RESTORED_20260119_183158/fps-teste/backend/db/analytics.db ".output sqlite-dump.sql" ".dump"
  
  echo "✅ Dump criado como sqlite-dump.sql"
  echo "📝 Convertendo formato SQLite para PostgreSQL..."
  
  # Converte SQLite para PostgreSQL
  cat > convert-to-postgres.sql << 'EOF'
-- Conversao de dados SQLite para PostgreSQL

-- Cria tabelas PostgreSQL
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    url TEXT,
    url_resumida TEXT,
    horario BIGINT,
    saude TEXT,
    error_code TEXT,
    ra TEXT,
    synced_at BIGINT,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);

CREATE TABLE IF NOT EXISTS search_logs (
    id BIGSERIAL PRIMARY KEY,
    ra TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ip TEXT,
    searched_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);

CREATE TABLE IF NOT EXISTS sync_metadata (
    id BIGSERIAL PRIMARY KEY,
    last_sync BIGINT,
    total_records BIGINT,
    sync_status TEXT,
    error_message TEXT,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_search_ra ON search_logs(ra);
CREATE INDEX IF NOT EXISTS idx_search_user ON search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_time ON search_logs(searched_at);
CREATE INDEX IF NOT EXISTS idx_ra ON transactions(ra);
CREATE INDEX IF NOT EXISTS idx_horario ON transactions(horario);
CREATE INDEX IF NOT EXISTS idx_saude ON transactions(saude);
CREATE INDEX IF NOT EXISTS idx_synced_at ON transactions(synced_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_event ON transactions(url, horario);

EOF

  # Extrai inserts do dump do SQLite
  grep "INSERT INTO" sqlite-dump.sql | \
  sed 's/INSERT INTO transactions/INSERT INTO transactions (id, url, url_resumida, horario, saude, error_code, ra, synced_at, created_at)/g' | \
  sed 's/INSERT INTO search_logs/INSERT INTO search_logs (id, ra, user_id, ip, searched_at)/g' | \
  sed 's/INSERT INTO sync_metadata/INSERT INTO sync_metadata (id, last_sync, total_records, sync_status, error_message)/g' >> convert-to-postgres.sql

  echo "✅ Arquivo PostgreSQL criado: convert-to-postgres.sql"
  echo ""
  echo "🔧 Para importar no PostgreSQL/Supabase:"
  echo "1. Abra o console SQL do Supabase"
  echo "2. Execute o arquivo convert-to-postgres.sql"
  echo "3. Ou use: cat convert-to-postgres.sql | psql \$DATABASE_URL"
  
  # Comprime o arquivo se for muito grande
  gzip -c convert-to-postgres.sql > convert-to-postgres.sql.gz
  echo "📦 Arquivo comprimido: convert-to-postgres.sql.gz"
  
  ls -lh convert-to-postgres.sql*
}

export_sqlite_to_sql