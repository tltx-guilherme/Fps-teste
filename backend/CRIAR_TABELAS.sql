-- ============================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS NO SUPABASE
-- ============================================
-- Execute este SQL no Dashboard do Supabase:
-- https://supabase.com/dashboard/project/jdwgrzkxpdehrprcxxhm/editor/sql
--
-- Depois clique em "RUN" para executar
-- ============================================

-- TABELA: transactions
-- Armazena todas as transações do AppDynamics
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

-- TABELA: search_logs
-- Armazena logs de pesquisa por RA
CREATE TABLE IF NOT EXISTS search_logs (
  id BIGSERIAL PRIMARY KEY,
  ra TEXT NOT NULL,
  user_id TEXT NOT NULL,
  ip TEXT,
  searched_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);

-- TABELA: sync_metadata
-- Armazena metadados de sincronização
CREATE TABLE IF NOT EXISTS sync_metadata (
  id BIGSERIAL PRIMARY KEY,
  last_sync BIGINT,
  total_records BIGINT,
  sync_status TEXT,
  error_message TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);

-- ============================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices na tabela transactions
CREATE INDEX IF NOT EXISTS idx_ra ON transactions(ra);
CREATE INDEX IF NOT EXISTS idx_horario ON transactions(horario);
CREATE INDEX IF NOT EXISTS idx_saude ON transactions(saude);
CREATE INDEX IF NOT EXISTS idx_synced_at ON transactions(synced_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_event ON transactions(url, horario);

-- Índices na tabela search_logs
CREATE INDEX IF NOT EXISTS idx_search_ra ON search_logs(ra);
CREATE INDEX IF NOT EXISTS idx_search_user ON search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_time ON search_logs(searched_at);

-- ============================================
-- DESABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
-- IMPORTANTE: Isso permite que a aplicação acesse as tabelas
-- sem restrições de segurança. Use apenas se você confia
-- completamente na sua aplicação e no ANON_KEY.
--
-- Se preferir manter RLS ativado, você precisará criar
-- políticas (policies) específicas para cada operação.

ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata DISABLE ROW LEVEL SECURITY;

-- ============================================
-- OPCIONAL: Habilitar RLS com políticas
-- ============================================
-- Se quiser manter segurança habilitada, comente as linhas
-- acima (DISABLE ROW LEVEL SECURITY) e descomente abaixo:

-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (equivalente a desabilitar RLS)
-- CREATE POLICY "Allow all operations" ON transactions FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all operations" ON search_logs FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all operations" ON sync_metadata FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Após executar, verifique se tudo foi criado:

-- Ver tabelas criadas
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Ver índices criados
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('transactions', 'search_logs', 'sync_metadata');

-- Contar registros (deve retornar 0 inicialmente)
-- SELECT COUNT(*) FROM transactions;
-- SELECT COUNT(*) FROM search_logs;
-- SELECT COUNT(*) FROM sync_metadata;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Após executar com sucesso, rode o teste:
-- node test_supabase_sdk.js
-- ============================================
