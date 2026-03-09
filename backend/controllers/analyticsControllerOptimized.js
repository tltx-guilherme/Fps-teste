// ============================================================================
// CONTROLLER OTIMIZADO - NOVA ARQUITETURA
// ============================================================================
// Usa metrics_hourly/daily para dados agregados RÁPIDOS (horários, totais)
// Usa transactions_raw para categorias (rápido com particionamento + índices)
// Formato de resposta IDÊNTICO ao frontend existente
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ============================================================================
// CATEGORIZAÇÃO DE URLs (idêntica ao controller antigo)
// ============================================================================

function categorizeUrl(url, urlResumida) {
  const lower = (url || urlResumida || '').toLowerCase();

  if (lower.includes('boletim') || lower.includes('disciplinasboletim') || lower.includes('notas')) return 'Boletim';
  if (lower.includes('frequencia') || lower.includes('presenca')) return 'Frequência';
  if (lower.includes('avisos') || lower.includes('aviso') || lower.includes('notificacoes')) return 'Avisos';
  if (lower.includes('atividades') || lower.includes('lista_ultimas_atividades') || lower.includes('tarefas')) return 'Atividades';
  if (lower.includes('foto') || lower.includes('imagem') || lower.includes('avatar') || lower.includes('perfil')) return 'Foto/Perfil';
  if (lower.includes('lgpd') || lower.includes('termo') || lower.includes('privacidade')) return 'LGPD/Termos';
  if (lower.includes('pix') || lower.includes('financeiro') || lower.includes('pagamento') || lower.includes('boleto')) return 'Financeiro';
  if (lower.includes('alunos') && lower.includes('user')) return 'Autenticação';
  if ((lower.includes('login') || lower.includes('auth') || lower.includes('logout')) && !lower.includes('alunos')) return 'Autenticação';
  if (lower.includes('transacoes') || lower.includes('autorizadas') || lower.includes('transacao')) return 'Transações';
  if (lower.includes('tema') || lower.includes('config') || lower.includes('configuracao')) return 'Configuração';
  if (lower.includes('home') || lower.includes('inicio') || lower.includes('dashboard')) return 'Página Inicial';
  if (lower.includes('mensag') || lower.includes('chat')) return 'Mensagens';
  if (lower.includes('calendario') || lower.includes('evento')) return 'Calendário';
  if (lower.includes('biblioteca') || lower.includes('livro')) return 'Biblioteca';
  if (lower.includes('video') || lower.includes('aula')) return 'Vídeos/Aulas';

  return 'Navegação Geral';
}

// ============================================================================
// 1. BUSCAR HORÁRIOS AGREGADOS (metrics_hourly) — PRÉ-CALCULADO, INSTANTÂNEO
// ============================================================================

async function getHourlyAggregated(startDateStr) {
  const { data, error } = await supabase
    .from('metrics_hourly')
    .select('hora, total_acessos, total_erros')
    .gte('data', startDateStr);

  if (error) {
    console.error('❌ Erro metrics_hourly:', error.message);
    return Array.from({ length: 24 }, (_, i) => ({ hora: i, acessos: 0, erros: 0 }));
  }

  // Somar por hora (agrega todos os dias do período)
  const hoursMap = {};
  for (const row of (data || [])) {
    const h = row.hora;
    if (!hoursMap[h]) hoursMap[h] = { acessos: 0, erros: 0 };
    hoursMap[h].acessos += Number(row.total_acessos) || 0;
    hoursMap[h].erros += Number(row.total_erros) || 0;
  }

  return Array.from({ length: 24 }, (_, i) => ({
    hora: i,
    acessos: hoursMap[i]?.acessos || 0,
    erros: hoursMap[i]?.erros || 0
  }));
}

// ============================================================================
// 2. BUSCAR TOTAIS DIÁRIOS (metrics_daily) — PRÉ-CALCULADO, INSTANTÂNEO
// ============================================================================

async function getDailyTotals(startDateStr) {
  const { data, error } = await supabase
    .from('metrics_daily')
    .select('total_acessos, total_erros')
    .gte('data', startDateStr);

  if (error) {
    console.error('❌ Erro metrics_daily:', error.message);
    return { totalEventos: 0, totalErros: 0 };
  }

  let totalEventos = 0, totalErros = 0;
  for (const row of (data || [])) {
    totalEventos += Number(row.total_acessos) || 0;
    totalErros += Number(row.total_erros) || 0;
  }

  return { totalEventos, totalErros };
}

// ============================================================================
// 3. BUSCAR DADOS PARA CATEGORIAS (transactions_raw com particionamento)
// ============================================================================

async function getCategoryData(startDateISO, maxRecords = 20000) {
  const pageSize = 1000;
  let results = [];
  let offset = 0;

  while (results.length < maxRecords) {
    const remaining = maxRecords - results.length;
    const fetchSize = Math.min(pageSize, remaining);

    const { data, error } = await supabase
      .from('transactions_raw')
      .select('url, url_resumida, saude, error_code')
      .gte('horario', startDateISO)
      .order('horario', { ascending: false })
      .range(offset, offset + fetchSize - 1);

    if (error) {
      console.error('❌ Erro transactions_raw:', error.message);
      break;
    }

    if (!data || data.length === 0) break;
    results = results.concat(data);

    if (data.length < fetchSize) break; // Acabaram os dados
    offset += data.length;
  }

  return results;
}

// ============================================================================
// 4. PROCESSAR CATEGORIAS + SAÚDE + ROTAS
// ============================================================================

function processCategoryAndHealth(rawRows) {
  const recursos = {};
  const resourceErrors = {};
  const resourceSlow = {};
  const healthStats = { normal: 0, slow: 0, error: 0 };
  const routes = {};

  for (const r of rawRows) {
    const url = r.url || r.url_resumida || '—';
    const categoria = categorizeUrl(r.url, r.url_resumida);
    const saude = (r.saude || '').toUpperCase();
    const hasError = saude === 'ERROR' || (r.error_code && r.error_code.length > 0);
    const isSlow = saude === 'SLOW' || saude === 'VERY_SLOW';

    // Contar por categoria
    recursos[categoria] = (recursos[categoria] || 0) + 1;

    // Erros por categoria
    if (hasError) {
      if (!resourceErrors[categoria]) resourceErrors[categoria] = { total: 0, errors: {} };
      resourceErrors[categoria].total++;

      if (r.error_code) {
        // error_code pode ser TEXT[] (array) ou TEXT (string)
        const erros = Array.isArray(r.error_code)
          ? r.error_code
          : r.error_code.split(',');
        for (const erro of erros) {
          const trimmed = typeof erro === 'string' ? erro.trim() : String(erro);
          if (trimmed) {
            resourceErrors[categoria].errors[trimmed] =
              (resourceErrors[categoria].errors[trimmed] || 0) + 1;
          }
        }
      }
    }

    // Lentas por categoria
    if (isSlow) {
      resourceSlow[categoria] = (resourceSlow[categoria] || 0) + 1;
    }

    // Estatísticas de saúde globais
    if (saude === 'NORMAL') healthStats.normal++;
    else if (saude === 'SLOW') healthStats.slow++;
    else if (saude === 'ERROR' || saude === 'VERY_SLOW') healthStats.error++;

    // Rotas mais acessadas
    if (!routes[url]) routes[url] = { url, quantidade: 0, erros: 0, lentas: 0 };
    routes[url].quantidade++;
    if (hasError) routes[url].erros++;
    if (isSlow) routes[url].lentas++;
  }

  // Formatar recursosMaisUsados (formato idêntico ao controller antigo)
  const recursosMaisUsados = Object.entries(recursos)
    .map(([categoria, quantidade]) => {
      const errInfo = resourceErrors[categoria] || { total: 0, errors: {} };
      const slowQty = resourceSlow[categoria] || 0;
      const errorRate = quantidade > 0 ? ((errInfo.total / quantidade) * 100).toFixed(1) : '0.0';
      const slowRate = quantidade > 0 ? ((slowQty / quantidade) * 100).toFixed(1) : '0.0';

      return {
        categoria,
        quantidade,
        erros: errInfo.total,
        lentas: slowQty,
        taxaErro: parseFloat(errorRate),
        taxaLenta: parseFloat(slowRate),
        tiposErro: Object.entries(errInfo.errors)
          .map(([tipo, count]) => ({ tipo, quantidade: count }))
          .sort((a, b) => b.quantidade - a.quantidade)
      };
    })
    .sort((a, b) => b.quantidade - a.quantidade);

  // Top rotas
  const rotasMaisAcessadas = Object.values(routes)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 50);

  return { recursosMaisUsados, healthStats, rotasMaisAcessadas };
}

// ============================================================================
// 5. ENDPOINT PRINCIPAL — getGeneralStatsOptimized
// ============================================================================

export async function getGeneralStatsOptimized(req, res) {
  const startTime = Date.now();
  const periodDays = parseInt(req.query.days) || 7;
  const startDate = new Date(Date.now() - (periodDays * 24 * 60 * 60 * 1000));
  const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const startDateISO = startDate.toISOString();                // full ISO

  try {
    console.log(`📊 [Optimized] Stats para ${periodDays} dias (desde ${startDateStr})...`);

    // 🚀 Executar queries em PARALELO (grande ganho de performance)
    const [hourlyData, dailyTotals, rawRows] = await Promise.all([
      getHourlyAggregated(startDateStr),     // metrics_hourly → instantâneo
      getDailyTotals(startDateStr),          // metrics_daily  → instantâneo
      getCategoryData(startDateISO, 20000)   // transactions_raw → rápido c/ particionamento
    ]);

    // Processar categorias e saúde dos raw rows
    const { recursosMaisUsados, healthStats, rotasMaisAcessadas } = processCategoryAndHealth(rawRows);

    const elapsedMs = Date.now() - startTime;
    console.log(`✅ [Optimized] Resposta em ${elapsedMs}ms (${rawRows.length} raw rows para categorias)`);

    // Resposta no formato IDÊNTICO ao que o frontend espera
    res.json({
      dataSource: 'metrics_aggregated',
      cache: 'HIT',
      tempo_ms: elapsedMs,
      totalEventos: dailyTotals.totalEventos,
      totalEventos24h: rawRows.length,
      horariosMaisUsados: hourlyData,
      horarios24h: hourlyData,
      recursosMaisUsados,
      rotasMaisAcessadas24h: rotasMaisAcessadas,
      limiteAnalisado: 'all',
      periodoDias: periodDays,
      estatisticasSaude: healthStats
    });

  } catch (error) {
    console.error('❌ Erro stats otimizadas:', error.message);
    res.status(500).json({ error: 'Falha ao consultar estatísticas' });
  }
}

// ============================================================================
// FIM DO CONTROLLER OTIMIZADO
// ============================================================================
