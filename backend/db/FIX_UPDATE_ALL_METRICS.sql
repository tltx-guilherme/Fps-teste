-- ============================================================
-- FIX DEFINITIVO: update_all_metrics() sem agregações aninhadas
-- Versão limpa: usa só COUNT/SUM direto, sem DISTINCT em jsonb_object_agg
-- Cole no Supabase SQL Editor e execute
-- ============================================================

DROP FUNCTION IF EXISTS update_all_metrics() CASCADE;

CREATE OR REPLACE FUNCTION update_all_metrics()
RETURNS TABLE(status TEXT, registros_processados INTEGER) AS $$
DECLARE
  v_ultima_id BIGINT;
  v_total     INTEGER := 0;
BEGIN

  -- Pegar a maior ultima_id_processada já registrada (usa a menor para não perder dados)
  SELECT COALESCE(MIN(ultima_id_processada), 0)
  INTO v_ultima_id
  FROM metrics_control
  WHERE metrica_tipo IN ('hourly', 'daily', 'monthly');

  -- ===================== METRICS_HOURLY =====================
  INSERT INTO metrics_hourly (
    data, hora,
    total_acessos, total_erros, total_lentas,
    taxa_erro, taxa_lenta,
    categorias, tipos_erro, saude_geral
  )
  SELECT
    DATE(horario)                       AS data,
    EXTRACT(HOUR FROM horario)::INTEGER AS hora,
    COUNT(*)::INTEGER                   AS total_acessos,
    COUNT(*) FILTER (WHERE saude = 'ERROR' OR error_code IS NOT NULL)::INTEGER AS total_erros,
    COUNT(*) FILTER (WHERE saude IN ('SLOW','VERY_SLOW'))::INTEGER             AS total_lentas,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE saude = 'ERROR' OR error_code IS NOT NULL)
      / NULLIF(COUNT(*), 0), 2
    )                                   AS taxa_erro,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE saude IN ('SLOW','VERY_SLOW'))
      / NULLIF(COUNT(*), 0), 2
    )                                   AS taxa_lenta,
    '{}'::jsonb                         AS categorias,
    '{}'::jsonb                         AS tipos_erro,
    CASE
      WHEN COUNT(*) FILTER (WHERE saude = 'ERROR' OR error_code IS NOT NULL) > COUNT(*) * 0.1 THEN 'ERROR'
      WHEN COUNT(*) FILTER (WHERE saude IN ('SLOW','VERY_SLOW')) > COUNT(*) * 0.2 THEN 'SLOW'
      ELSE 'NORMAL'
    END                                 AS saude_geral
  FROM transactions_raw
  WHERE id > v_ultima_id
  GROUP BY DATE(horario), EXTRACT(HOUR FROM horario)
  ON CONFLICT (data, hora) DO UPDATE SET
    total_acessos      = metrics_hourly.total_acessos + EXCLUDED.total_acessos,
    total_erros        = metrics_hourly.total_erros   + EXCLUDED.total_erros,
    total_lentas       = metrics_hourly.total_lentas  + EXCLUDED.total_lentas,
    taxa_erro          = EXCLUDED.taxa_erro,
    taxa_lenta         = EXCLUDED.taxa_lenta,
    saude_geral        = EXCLUDED.saude_geral,
    ultima_atualizacao = NOW();

  -- ===================== METRICS_DAILY =====================
  INSERT INTO metrics_daily (
    data,
    total_acessos, total_erros, total_lentas,
    taxa_erro, taxa_lenta,
    categorias, tipos_erro, saude_geral,
    hora_pico, acessos_pico
  )
  WITH contagem_hora AS (
    SELECT
      DATE(horario)                       AS data,
      EXTRACT(HOUR FROM horario)::INTEGER AS hora,
      COUNT(*)                            AS cnt
    FROM transactions_raw
    WHERE id > v_ultima_id
    GROUP BY DATE(horario), EXTRACT(HOUR FROM horario)
  ),
  pico_hora AS (
    SELECT DISTINCT ON (data) data, hora AS hora_pico, cnt AS acessos_pico
    FROM contagem_hora
    ORDER BY data, cnt DESC
  ),
  totais AS (
    SELECT
      DATE(horario) AS data,
      COUNT(*)::INTEGER AS total_acessos,
      COUNT(*) FILTER (WHERE saude = 'ERROR' OR error_code IS NOT NULL)::INTEGER AS total_erros,
      COUNT(*) FILTER (WHERE saude IN ('SLOW','VERY_SLOW'))::INTEGER             AS total_lentas
    FROM transactions_raw
    WHERE id > v_ultima_id
    GROUP BY DATE(horario)
  )
  SELECT
    t.data,
    t.total_acessos,
    t.total_erros,
    t.total_lentas,
    ROUND(100.0 * t.total_erros  / NULLIF(t.total_acessos, 0), 2) AS taxa_erro,
    ROUND(100.0 * t.total_lentas / NULLIF(t.total_acessos, 0), 2) AS taxa_lenta,
    '{}'::jsonb AS categorias,
    '{}'::jsonb AS tipos_erro,
    CASE
      WHEN t.total_erros  > t.total_acessos * 0.1 THEN 'ERROR'
      WHEN t.total_lentas > t.total_acessos * 0.2 THEN 'SLOW'
      ELSE 'NORMAL'
    END AS saude_geral,
    p.hora_pico,
    p.acessos_pico
  FROM totais t
  LEFT JOIN pico_hora p USING (data)
  ON CONFLICT (data) DO UPDATE SET
    total_acessos      = metrics_daily.total_acessos + EXCLUDED.total_acessos,
    total_erros        = metrics_daily.total_erros   + EXCLUDED.total_erros,
    total_lentas       = metrics_daily.total_lentas  + EXCLUDED.total_lentas,
    taxa_erro          = EXCLUDED.taxa_erro,
    taxa_lenta         = EXCLUDED.taxa_lenta,
    saude_geral        = EXCLUDED.saude_geral,
    hora_pico          = EXCLUDED.hora_pico,
    acessos_pico       = EXCLUDED.acessos_pico,
    ultima_atualizacao = NOW();

  -- ===================== METRICS_MONTHLY =====================
  INSERT INTO metrics_monthly (
    ano, mes,
    total_acessos, total_erros, total_lentas,
    taxa_erro, taxa_lenta,
    categorias, tipos_erro, saude_geral,
    dia_pico, acessos_pico
  )
  WITH contagem_dia AS (
    SELECT
      EXTRACT(YEAR  FROM horario)::INTEGER AS ano,
      EXTRACT(MONTH FROM horario)::INTEGER AS mes,
      DATE(horario)                        AS dia,
      COUNT(*)                             AS cnt
    FROM transactions_raw
    WHERE id > v_ultima_id
    GROUP BY ano, mes, dia
  ),
  pico_dia AS (
    SELECT DISTINCT ON (ano, mes)
      ano, mes,
      EXTRACT(DAY FROM dia)::INTEGER AS dia_pico,
      cnt AS acessos_pico
    FROM contagem_dia
    ORDER BY ano, mes, cnt DESC
  ),
  totais AS (
    SELECT
      EXTRACT(YEAR  FROM horario)::INTEGER AS ano,
      EXTRACT(MONTH FROM horario)::INTEGER AS mes,
      COUNT(*)::INTEGER AS total_acessos,
      COUNT(*) FILTER (WHERE saude = 'ERROR' OR error_code IS NOT NULL)::INTEGER AS total_erros,
      COUNT(*) FILTER (WHERE saude IN ('SLOW','VERY_SLOW'))::INTEGER             AS total_lentas
    FROM transactions_raw
    WHERE id > v_ultima_id
    GROUP BY ano, mes
  )
  SELECT
    t.ano,
    t.mes,
    t.total_acessos,
    t.total_erros,
    t.total_lentas,
    ROUND(100.0 * t.total_erros  / NULLIF(t.total_acessos, 0), 2) AS taxa_erro,
    ROUND(100.0 * t.total_lentas / NULLIF(t.total_acessos, 0), 2) AS taxa_lenta,
    '{}'::jsonb AS categorias,
    '{}'::jsonb AS tipos_erro,
    CASE
      WHEN t.total_erros  > t.total_acessos * 0.1 THEN 'ERROR'
      WHEN t.total_lentas > t.total_acessos * 0.2 THEN 'SLOW'
      ELSE 'NORMAL'
    END AS saude_geral,
    p.dia_pico,
    p.acessos_pico
  FROM totais t
  LEFT JOIN pico_dia p USING (ano, mes)
  ON CONFLICT (ano, mes) DO UPDATE SET
    total_acessos      = metrics_monthly.total_acessos + EXCLUDED.total_acessos,
    total_erros        = metrics_monthly.total_erros   + EXCLUDED.total_erros,
    total_lentas       = metrics_monthly.total_lentas  + EXCLUDED.total_lentas,
    taxa_erro          = EXCLUDED.taxa_erro,
    taxa_lenta         = EXCLUDED.taxa_lenta,
    saude_geral        = EXCLUDED.saude_geral,
    dia_pico           = EXCLUDED.dia_pico,
    acessos_pico       = EXCLUDED.acessos_pico,
    ultima_atualizacao = NOW();

  -- ===================== ATUALIZAR CONTROLE =====================
  UPDATE metrics_control SET
    ultima_id_processada = (SELECT COALESCE(MAX(id), 0) FROM transactions_raw),
    ultima_atualizacao   = NOW(),
    proxima_atualizacao  = NOW() + INTERVAL '5 minutes',
    last_processed       = NOW()
  WHERE metrica_tipo IN ('hourly', 'daily', 'monthly');

  UPDATE metrics_control SET
    last_processed = NOW()
  WHERE id = 1;

  SELECT COUNT(*)::INTEGER INTO v_total
  FROM transactions_raw
  WHERE id > v_ultima_id;

  RETURN QUERY SELECT 'OK'::TEXT, v_total;

END;
$$ LANGUAGE plpgsql;
