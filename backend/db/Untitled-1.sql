-- ============================================================================
-- SCHEMA_METRICAS.sql CORRIGIDO
-- ============================================================================

-- 1. TABELA BRUTA (particionada por mês)
CREATE TABLE IF NOT EXISTS transactions_raw (
  id BIGSERIAL,
  url TEXT,
  url_resumida TEXT,
  horario TIMESTAMPTZ NOT NULL,
  saude TEXT,
  error_code TEXT[],
  ra TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partições por mês
CREATE TABLE IF NOT EXISTS transactions_raw_2026_01 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS transactions_raw_2026_02 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE IF NOT EXISTS transactions_raw_2026_03 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE IF NOT EXISTS transactions_raw_2026_04 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE IF NOT EXISTS transactions_raw_2026_05 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE IF NOT EXISTS transactions_raw_2026_06 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS transactions_raw_2026_07 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS transactions_raw_2026_08 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE IF NOT EXISTS transactions_raw_2026_09 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE IF NOT EXISTS transactions_raw_2026_10 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE IF NOT EXISTS transactions_raw_2026_11 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE IF NOT EXISTS transactions_raw_2026_12 PARTITION OF transactions_raw
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Índices na tabela bruta
CREATE INDEX IF NOT EXISTS idx_transactions_raw_horario ON transactions_raw(horario DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_raw_created ON transactions_raw(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_raw_saude ON transactions_raw(saude);

-- ============================================================================
-- 2. TABELAS DE MÉTRICAS AGREGADAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS metrics_hourly (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL,
  hora INTEGER NOT NULL,
  total_acessos INTEGER DEFAULT 0,
  total_erros INTEGER DEFAULT 0,
  total_lentas INTEGER DEFAULT 0,
  taxa_erro NUMERIC(5,2) DEFAULT 0,
  taxa_lenta NUMERIC(5,2) DEFAULT 0,
  categorias JSONB DEFAULT '{}',
  tipos_erro JSONB DEFAULT '{}',
  saude_geral TEXT DEFAULT 'NORMAL',
  ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data, hora)
);

CREATE TABLE IF NOT EXISTS metrics_daily (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL UNIQUE,
  total_acessos INTEGER DEFAULT 0,
  total_erros INTEGER DEFAULT 0,
  total_lentas INTEGER DEFAULT 0,
  taxa_erro NUMERIC(5,2) DEFAULT 0,
  taxa_lenta NUMERIC(5,2) DEFAULT 0,
  categorias JSONB DEFAULT '{}',
  tipos_erro JSONB DEFAULT '{}',
  saude_geral TEXT DEFAULT 'NORMAL',
  hora_pico INTEGER,
  acessos_pico INTEGER,
  ultima_atualizacao TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metrics_monthly (
  id BIGSERIAL PRIMARY KEY,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  total_acessos INTEGER DEFAULT 0,
  total_erros INTEGER DEFAULT 0,
  total_lentas INTEGER DEFAULT 0,
  taxa_erro NUMERIC(5,2) DEFAULT 0,
  taxa_lenta NUMERIC(5,2) DEFAULT 0,
  categorias JSONB DEFAULT '{}',
  tipos_erro JSONB DEFAULT '{}',
  saude_geral TEXT DEFAULT 'NORMAL',
  dia_pico INTEGER,
  acessos_pico INTEGER,
  ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ano, mes)
);

-- Índices em métricas
CREATE INDEX IF NOT EXISTS idx_metrics_hourly_data ON metrics_hourly(data DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_data ON metrics_daily(data DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_monthly_ano_mes ON metrics_monthly(ano DESC, mes DESC);

-- ============================================================================
-- 3. TABELA DE CONTROLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS metrics_control (
  id BIGSERIAL PRIMARY KEY,
  metrica_tipo TEXT NOT NULL UNIQUE,
  ultima_id_processada BIGINT DEFAULT 0,
  ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  proxima_atualizacao TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO metrics_control (metrica_tipo) VALUES
  ('hourly'),
  ('daily'),
  ('monthly')
ON CONFLICT (metrica_tipo) DO NOTHING;

-- ============================================================================
-- 4. FUNÇÃO PLPGSQL - UPDATE INCREMENTAL
-- ============================================================================

CREATE OR REPLACE FUNCTION update_all_metrics()
RETURNS TABLE(status TEXT, registros_processados INTEGER) AS $$
DECLARE
  v_ultima_id_hourly BIGINT;
  v_ultima_id_daily BIGINT;
  v_ultima_id_monthly BIGINT;
  v_total_processed INTEGER := 0;
BEGIN
  
  SELECT ultima_id_processada INTO v_ultima_id_hourly FROM metrics_control WHERE metrica_tipo = 'hourly';
  SELECT ultima_id_processada INTO v_ultima_id_daily FROM metrics_control WHERE metrica_tipo = 'daily';
  SELECT ultima_id_processada INTO v_ultima_id_monthly FROM metrics_control WHERE metrica_tipo = 'monthly';

  -- ========== ATUALIZAR METRICS_HOURLY ==========
  INSERT INTO metrics_hourly (data, hora, total_acessos, total_erros, total_lentas, taxa_erro, taxa_lenta, categorias, tipos_erro, saude_geral)
  SELECT
    DATE(t.horario) as data,
    EXTRACT(HOUR FROM t.horario)::INTEGER as hora,
    COUNT(*) as total_acessos,
    SUM(CASE WHEN t.saude = 'ERROR' OR t.error_code IS NOT NULL THEN 1 ELSE 0 END)::INTEGER as total_erros,
    SUM(CASE WHEN t.saude IN ('SLOW', 'VERY_SLOW') THEN 1 ELSE 0 END)::INTEGER as total_lentas,
    ROUND(100.0 * SUM(CASE WHEN t.saude = 'ERROR' OR t.error_code IS NOT NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2)::NUMERIC as taxa_erro,
    ROUND(100.0 * SUM(CASE WHEN t.saude IN ('SLOW', 'VERY_SLOW') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2)::NUMERIC as taxa_lenta,
    jsonb_object_agg(COALESCE(t.url_resumida, 'Geral'), COUNT(*)) FILTER (WHERE t.url_resumida IS NOT NULL) as categorias,
    jsonb_object_agg(COALESCE(t.error_code[1], 'Sem Erro'), COUNT(*)) FILTER (WHERE t.error_code IS NOT NULL) as tipos_erro,
    CASE 
      WHEN SUM(CASE WHEN t.saude = 'ERROR' OR t.error_code IS NOT NULL THEN 1 ELSE 0 END) > COUNT(*) * 0.1 THEN 'ERROR'
      WHEN SUM(CASE WHEN t.saude IN ('SLOW', 'VERY_SLOW') THEN 1 ELSE 0 END) > COUNT(*) * 0.2 THEN 'SLOW'
      ELSE 'NORMAL'
    END as saude_geral
  FROM transactions_raw t
  WHERE t.id > v_ultima_id_hourly
  GROUP BY DATE(t.horario), EXTRACT(HOUR FROM t.horario)
  ON CONFLICT (data, hora) DO UPDATE SET
    total_acessos = EXCLUDED.total_acessos,
    total_erros = EXCLUDED.total_erros,
    total_lentas = EXCLUDED.total_lentas,
    taxa_erro = EXCLUDED.taxa_erro,
    taxa_lenta = EXCLUDED.taxa_lenta,
    categorias = EXCLUDED.categorias,
    tipos_erro = EXCLUDED.tipos_erro,
    saude_geral = EXCLUDED.saude_geral,
    ultima_atualizacao = NOW();

  -- ========== ATUALIZAR METRICS_DAILY ==========
  INSERT INTO metrics_daily (data, total_acessos, total_erros, total_lentas, taxa_erro, taxa_lenta, categorias, tipos_erro, saude_geral, hora_pico, acessos_pico)
  SELECT
    DATE(t.horario) as data,
    COUNT(*) as total_acessos,
    SUM(CASE WHEN t.saude = 'ERROR' OR t.error_code IS NOT NULL THEN 1 ELSE 0 END)::INTEGER as total_erros,
    SUM(CASE WHEN t.saude IN ('SLOW', 'VERY_SLOW') THEN 1 ELSE 0 END)::INTEGER as total_lentas,
    ROUND(100.0 * SUM(CASE WHEN t.saude = 'ERROR' OR t.error_code IS NOT NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2)::NUMERIC as taxa_erro,
    ROUND(100.0 * SUM(CASE WHEN t.saude IN ('SLOW', 'VERY_SLOW') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2)::NUMERIC as taxa_lenta,
    jsonb_object_agg(COALESCE(t.url_resumida, 'Geral'), COUNT(*)) FILTER (WHERE t.url_resumida IS NOT NULL) as categorias,
    jsonb_object_agg(COALESCE(t.error_code[1], 'Sem Erro'), COUNT(*)) FILTER (WHERE t.error_code IS NOT NULL) as tipos_erro,
    CASE 
      WHEN SUM(CASE WHEN t.saude = 'ERROR' OR t.error_code IS NOT NULL THEN 1 ELSE 0 END) > COUNT(*) * 0.1 THEN 'ERROR'
      WHEN SUM(CASE WHEN t.saude IN ('SLOW', 'VERY_SLOW') THEN 1 ELSE 0 END) > COUNT(*) * 0.2 THEN 'SLOW'
      ELSE 'NORMAL'
    END as saude_geral,
    (ARRAY_AGG(EXTRACT(HOUR FROM t.horario)::INTEGER ORDER BY COUNT(*) DESC))[1] as hora_pico,
    MAX(COUNT(*)) as acessos_pico
  FROM transactions_raw t
  WHERE t.id > v_ultima_id_daily
  GROUP BY DATE(t.horario)
  ON CONFLICT (data) DO UPDATE SET
    total_acessos = EXCLUDED.total_acessos,
    total_erros = EXCLUDED.total_erros,
    total_lentas = EXCLUDED.total_lentas,
    taxa_erro = EXCLUDED.taxa_erro,
    taxa_lenta = EXCLUDED.taxa_lenta,
    categorias = EXCLUDED.categorias,
    tipos_erro = EXCLUDED.tipos_erro,
    saude_geral = EXCLUDED.saude_geral,
    hora_pico = EXCLUDED.hora_pico,
    acessos_pico = EXCLUDED.acessos_pico,
    ultima_atualizacao = NOW();

  -- ========== ATUALIZAR METRICS_MONTHLY ==========
  INSERT INTO metrics_monthly (ano, mes, total_acessos, total_erros, total_lentas, taxa_erro, taxa_lenta, categorias, tipos_erro, saude_geral, dia_pico, acessos_pico)
  SELECT
    EXTRACT(YEAR FROM t.horario)::INTEGER as ano,
    EXTRACT(MONTH FROM t.horario)::INTEGER as mes,
    COUNT(*) as total_acessos,
    SUM(CASE WHEN t.saude = 'ERROR' OR t.error_code IS NOT NULL THEN 1 ELSE 0 END)::INTEGER as total_erros,
    SUM(CASE WHEN t.saude IN ('SLOW', 'VERY_SLOW') THEN 1 ELSE 0 END)::INTEGER as total_lentas,
    ROUND(100.0 * SUM(CASE WHEN t.saude = 'ERROR' OR t.error_code IS NOT NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2)::NUMERIC as taxa_erro,
    ROUND(100.0 * SUM(CASE WHEN t.saude IN ('SLOW', 'VERY_SLOW') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2)::NUMERIC as taxa_lenta,
    jsonb_object_agg(COALESCE(t.url_resumida, 'Geral'), COUNT(*)) FILTER (WHERE t.url_resumida IS NOT NULL) as categorias,
    jsonb_object_agg(COALESCE(t.error_code[1], 'Sem Erro'), COUNT(*)) FILTER (WHERE t.error_code IS NOT NULL) as tipos_erro,
    CASE 
      WHEN SUM(CASE WHEN t.saude = 'ERROR' OR t.error_code IS NOT NULL THEN 1 ELSE 0 END) > COUNT(*) * 0.1 THEN 'ERROR'
      WHEN SUM(CASE WHEN t.saude IN ('SLOW', 'VERY_SLOW') THEN 1 ELSE 0 END) > COUNT(*) * 0.2 THEN 'SLOW'
      ELSE 'NORMAL'
    END as saude_geral,
    (ARRAY_AGG(EXTRACT(DAY FROM t.horario)::INTEGER ORDER BY COUNT(*) DESC))[1] as dia_pico,
    MAX(COUNT(*)) as acessos_pico
  FROM transactions_raw t
  WHERE t.id > v_ultima_id_monthly
  GROUP BY EXTRACT(YEAR FROM t.horario), EXTRACT(MONTH FROM t.horario)
  ON CONFLICT (ano, mes) DO UPDATE SET
    total_acessos = EXCLUDED.total_acessos,
    total_erros = EXCLUDED.total_erros,
    total_lentas = EXCLUDED.total_lentas,
    taxa_erro = EXCLUDED.taxa_erro,
    taxa_lenta = EXCLUDED.taxa_lenta,
    categorias = EXCLUDED.categorias,
    tipos_erro = EXCLUDED.tipos_erro,
    saude_geral = EXCLUDED.saude_geral,
    dia_pico = EXCLUDED.dia_pico,
    acessos_pico = EXCLUDED.acessos_pico,
    ultima_atualizacao = NOW();

  UPDATE metrics_control SET
    ultima_id_processada = (SELECT MAX(id) FROM transactions_raw),
    ultima_atualizacao = NOW(),
    proxima_atualizacao = NOW() + INTERVAL '5 minutes'
  WHERE metrica_tipo IN ('hourly', 'daily', 'monthly');

  v_total_processed := (SELECT COUNT(*) FROM transactions_raw WHERE id > v_ultima_id_hourly);

  RETURN QUERY SELECT 
    'OK'::TEXT as status,
    v_total_processed as registros_processados;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIM DO SCHEMA CORRIGIDO
-- ============================================================================