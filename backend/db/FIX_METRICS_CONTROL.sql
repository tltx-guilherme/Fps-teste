-- ============================================
-- FIX: Adicionar last_processed para compatibilidade
-- ============================================

-- Adicionar coluna last_processed
ALTER TABLE metrics_control 
ADD COLUMN IF NOT EXISTS last_processed TIMESTAMPTZ DEFAULT NOW() - INTERVAL '1 day';

-- Inserir registro de controle com id=1 (usado pelo newArchSync.js)
INSERT INTO metrics_control (id, metrica_tipo, ultima_id_processada, last_processed)
VALUES (1, 'sync', 0, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET
  last_processed = NOW() - INTERVAL '1 day';

-- Verificar
SELECT * FROM metrics_control WHERE id = 1;
