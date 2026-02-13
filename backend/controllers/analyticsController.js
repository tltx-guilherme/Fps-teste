import axios from "axios";
import { getLocalStats, getSyncStatus, logSearchRA, queryLocal, getSearchLogsDB, getAllSearchLogsDB } from "../db/syncService.js";

// Função para categorizar URLs
function categorizeUrl(url, urlResumida) {
  const lower = (url || urlResumida || "").toLowerCase();
  
  // Categorias específicas de educação
  if (lower.includes("boletim") || lower.includes("disciplinasboletim") || lower.includes("notas")) return "Boletim";
  if (lower.includes("frequencia") || lower.includes("presenca")) return "Frequência";
  if (lower.includes("avisos") || lower.includes("aviso") || lower.includes("notificacoes")) return "Avisos";
  if (lower.includes("atividades") || lower.includes("lista_ultimas_atividades") || lower.includes("tarefas")) return "Atividades";
  if (lower.includes("foto") || lower.includes("imagem") || lower.includes("avatar") || lower.includes("perfil")) return "Foto/Perfil";
  if (lower.includes("lgpd") || lower.includes("termo") || lower.includes("privacidade")) return "LGPD/Termos";
  if (lower.includes("pix") || lower.includes("financeiro") || lower.includes("pagamento") || lower.includes("boleto")) return "Financeiro";
  if (lower.includes("alunos") && lower.includes("user")) return "Autenticação";
  if ((lower.includes("login") || lower.includes("auth") || lower.includes("logout")) && !lower.includes("alunos")) return "Autenticação";
  if (lower.includes("transacoes") || lower.includes("autorizadas") || lower.includes("transacao")) return "Transações";
  if (lower.includes("tema") || lower.includes("config") || lower.includes("configuracao")) return "Configuração";
  if (lower.includes("home") || lower.includes("inicio") || lower.includes("dashboard")) return "Página Inicial";
  if (lower.includes("mensag") || lower.includes("chat")) return "Mensagens";
  if (lower.includes("calendario") || lower.includes("evento")) return "Calendário";
  if (lower.includes("biblioteca") || lower.includes("livro")) return "Biblioteca";
  if (lower.includes("video") || lower.includes("aula")) return "Vídeos/Aulas";
  
  // Se não foi categorizado, retorna "Navegação Geral"
  return "Navegação Geral";
}

export async function getGeneralStats(req, res) {
  // Suporte a limit=all (sem limite) além de valor numérico
  const rawLimit = req.query.limit;
  const unlimited = rawLimit === 'all';
  const maxLimit = 500000;
  const limit = unlimited ? null : Math.min(parseInt(rawLimit) || 100000, maxLimit);
  
  // Permite filtrar por período (dias)
  const periodDays = parseInt(req.query.days) || 7;
  
  // Tenta usar banco local primeiro (muito mais rápido)
  const useLocal = req.query.source !== 'appdynamics';
  
  let rows = [];
  let dataSource = 'appdynamics';
  let horarios24h = null;
  let rotasTop24h = [];
  let totalEventos24h = null;
  
  if (useLocal) {
    try {
      const syncStatus = await getSyncStatus();
      const localData = await getLocalStats({ limit: unlimited ? 'all' : limit, daysAgo: periodDays });
      // Captura recorte fixo de 24h para "Acessos por horário" e "Top rotas"
      const local24h = await getLocalStats({ limit: 200000, daysAgo: 1 });
      
      if (localData && localData.length > 0) {
        // Converte formato local para formato esperado
        rows = localData.map(r => [
          [r.url],
          r.url_resumida,
          r.horario,
          r.saude,
          r.error_code ? r.error_code.split(',') : []
        ]);
        dataSource = 'local_database';
        console.log(`📊 Usando banco local: ${rows.length} registros (última sync: ${new Date(syncStatus.last_sync).toLocaleString()})`);

        // Agregados de 24h
        try {
          const horas = Array.from({ length: 24 }, (_, i) => ({ hora: i, acessos: 0, erros: 0 }));
          const rotas = {};
          for (const r of local24h) {
            const hour = new Date(r.horario).getHours();
            if (!Number.isNaN(hour)) {
              horas[hour].acessos += 1;
              const up = (r.saude || '').toUpperCase();
              const hasErr = up === 'ERROR' || (r.error_code || '').length > 0;
              if (hasErr) horas[hour].erros += 1;
            }
            const url = r.url || r.url_resumida || '—';
            if (!rotas[url]) rotas[url] = { url, quantidade: 0, erros: 0, lentas: 0 };
            rotas[url].quantidade += 1;
            const up = (r.saude || '').toUpperCase();
            if (up === 'ERROR' || (r.error_code || '').length > 0) rotas[url].erros += 1;
            if (up === 'SLOW' || up === 'VERY_SLOW') rotas[url].lentas += 1;
          }
          horarios24h = horas;
          rotasTop24h = Object.values(rotas).sort((a, b) => b.quantidade - a.quantidade).slice(0, 50);
          totalEventos24h = Array.isArray(local24h) ? local24h.length : 0;
        } catch (e) {
          console.warn('⚠️  Falha ao calcular agregados de 24h:', e.message);
        }
      }
    } catch (error) {
      console.warn('⚠️  Erro ao buscar do banco local, usando AppDynamics:', error.message);
    }
  }
  
  // Se não há dados locais ou forçou AppDynamics, busca da API
  if (rows.length === 0) {
    let timeFilter = '';
    if (periodDays) {
      const now = new Date();
      const startDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
      const startTimestamp = startDate.getTime();
      timeFilter = `AND eventTimestamp >= ${startTimestamp}`;
    }
    
    const query = `
      SELECT 
        segments.httpData.url, 
        transactionName AS "URL Resumida", 
        eventTimestamp AS "Horário da chamada", 
        userExperience AS "Saúde da chamada",
        segments.errorList.errorCode AS "Tipo de Erro"
      FROM transactions 
      WHERE application = "Aluno Online"
      ${timeFilter}
      ORDER BY eventTimestamp DESC
      ${unlimited ? '' : `LIMIT ${limit}`}
    `;

    try {
      const resp = await axios.post(
        process.env.APPD_ANALYTICS_URL,
        { query },
        {
          headers: {
            "X-Events-API-AccountName": process.env.APPD_ACCOUNT_NAME,
            "X-Events-API-Key": process.env.APPD_API_KEY,
            "Content-Type": "application/vnd.appd.events+json;v=2",
          },
        }
      );

      const data = resp.data?.[0];
      if (!data || !data.results) {
        return res.json({
          horariosMaisUsados: [],
          recursosMaisUsados: [],
          totalEventos: 0
        });
      }

      rows = data.results;
      console.log(`📡 Usando AppDynamics API: ${rows.length} registros`);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao buscar dados',
        message: error.message 
      });
    }
  }
  
  try {
    
    // Processa horários, recursos e erros
    const horarios = {};
    const horariosErros = {}; // Erros por horário
    const recursos = {};
    const errors = {};
    const healthStats = { normal: 0, slow: 0, error: 0 };
    const resourceErrors = {}; // Erros por categoria
    const resourceSlow = {}; // Lentas por categoria
    
    rows.forEach((r) => {
      const urls = r[0] || [];
      const urlResumida = r[1] || "";
      const horario = r[2];
      const saude = (r[3] || "").toUpperCase();
      const erros = r[4] || [];
      
      // Agrupa por hora do dia (0-23)
      if (horario) {
        const date = new Date(horario);
        const hora = date.getHours();
        horarios[hora] = (horarios[hora] || 0) + 1;
        
        // Conta erros por horário
        if (saude === "ERROR" || erros.length > 0) {
          horariosErros[hora] = (horariosErros[hora] || 0) + 1;
        }
      }
      
      // Agrupa por categoria de recurso
      const categoria = categorizeUrl(urls[0] || "", urlResumida);
      recursos[categoria] = (recursos[categoria] || 0) + 1;
      
      // Conta erros por categoria
      if (saude === "ERROR" || erros.length > 0) {
        if (!resourceErrors[categoria]) {
          resourceErrors[categoria] = { total: 0, errors: {} };
        }
        resourceErrors[categoria].total++;
        
        erros.forEach(erro => {
          if (erro) {
            resourceErrors[categoria].errors[erro] = 
              (resourceErrors[categoria].errors[erro] || 0) + 1;
          }
        });
      }
      
      // Conta lentas por categoria
      if (saude === "SLOW" || saude === "VERY_SLOW") {
        if (!resourceSlow[categoria]) {
          resourceSlow[categoria] = { total: 0 };
        }
        resourceSlow[categoria].total++;
      }
      
      // Estatísticas de saúde
      if (saude === "NORMAL") healthStats.normal++;
      else if (saude === "SLOW") healthStats.slow++;
      else if (saude === "ERROR" || saude === "VERY_SLOW") healthStats.error++;
    });

    // Formata horários (array de 24 posições) com info de erros
    const horariosMaisUsados = Array.from({ length: 24 }, (_, i) => ({
      hora: i,
      acessos: horarios[i] || 0,
      erros: horariosErros[i] || 0
    }));

    // Formata recursos (ordenado do maior para o menor) com info de erros e lentas
    const recursosMaisUsados = Object.entries(recursos)
      .map(([categoria, quantidade]) => {
        const errorInfo = resourceErrors[categoria] || { total: 0, errors: {} };
        const slowInfo = resourceSlow[categoria] || { total: 0 };
        const errorRate = ((errorInfo.total / quantidade) * 100).toFixed(1);
        const slowRate = ((slowInfo.total / quantidade) * 100).toFixed(1);
        
        return { 
          categoria, 
          quantidade,
          erros: errorInfo.total,
          lentas: slowInfo.total,
          taxaErro: parseFloat(errorRate),
          taxaLenta: parseFloat(slowRate),
          tiposErro: Object.entries(errorInfo.errors || {})
            .map(([tipo, count]) => ({ tipo, quantidade: count }))
            .sort((a, b) => b.quantidade - a.quantidade)
        };
      })
      .sort((a, b) => b.quantidade - a.quantidade);

    res.json({
      dataSource, // 'local_database' ou 'appdynamics'
      cache: dataSource === 'local_database' ? 'HIT' : 'MISS',
      horarios24h: horarios24h,
      rotasMaisAcessadas24h: rotasTop24h,
      totalEventos24h,
      horariosMaisUsados,
      recursosMaisUsados,
      totalEventos: rows.length,
      limiteAnalisado: unlimited ? 'all' : limit,
      periodoDias: periodDays,
      estatisticasSaude: healthStats
    });
  } catch (e) {
    console.error("Erro ao buscar estatísticas:", e.response?.data || e.message);
    res.status(500).json({ error: "Falha ao consultar estatísticas" });
  }
}

export async function searchByRA(req, res) {
  const ra = req.params.ra;
  // Auditar quem pesquisou e quando
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || null;
    const userId = req.userId || 'anonymous';
    await logSearchRA({ ra, userId, ip });
  } catch (e) {
    console.warn('⚠️  Falha ao registrar auditoria de pesquisa:', e.message);
  }

  const query = `
    SELECT 
      segments.httpData.url, 
      transactionName AS "URL Resumida", 
      eventTimestamp AS "Horário da chamada", 
      userExperience AS "Saúde da chamada", 
      segments.errorList.errorCode AS "Tipo de Erro" 
    FROM transactions 
    WHERE application = "Aluno Online" 
    AND segments.httpData.url = "*${ra}*"
    ORDER BY eventTimestamp DESC
    LIMIT 2000
  `;

  try {
    const resp = await axios.post(
      process.env.APPD_ANALYTICS_URL,
      { query },
      {
        headers: {
          "X-Events-API-AccountName": process.env.APPD_ACCOUNT_NAME,
          "X-Events-API-Key": process.env.APPD_API_KEY,
          "Content-Type": "application/vnd.appd.events+json;v=2",
        },
      }
    );

    // Processa os resultados
    const data = resp.data?.[0];
    if (!data || !data.results) {
      return res.json({
        ra,
        totalEventos: 0,
        ultimoAcesso: null,
        eventos: [],
        categorias: {},
        estatisticas: {
          normal: 0,
          slow: 0,
          error: 0
        }
      });
    }

    const rows = data.results;

    const eventos = rows.map((r) => {
      const urls = r[0] || []; // segments.httpData.url é um array
      const urlResumida = r[1] || "";
      const horario = r[2];
      const saude = r[3] || "UNKNOWN";
      const erros = r[4] || [];

      const categoria = categorizeUrl(urls[0] || "", urlResumida);

      return {
        urls: urls,
        urlPrincipal: urls[0] || "",
        urlResumida: urlResumida,
        horario: horario,
        saude: saude,
        erro: erros.length > 0 ? erros[0] : null,
        categoria: categoria
      };
    });

    // Conta por categoria
    const categorias = eventos.reduce((acc, ev) => {
      acc[ev.categoria] = (acc[ev.categoria] || 0) + 1;
      return acc;
    }, {});

    // Estatísticas de saúde
    const estatisticas = eventos.reduce((acc, ev) => {
      const saude = ev.saude.toLowerCase();
      if (saude === "normal") acc.normal++;
      else if (saude === "slow") acc.slow++;
      else if (saude === "error") acc.error++;
      return acc;
    }, { normal: 0, slow: 0, error: 0 });

    res.json({
      ra,
      totalEventos: eventos.length,
      ultimoAcesso: eventos[0]?.horario || null,
      eventos,
      categorias,
      estatisticas
    });
  } catch (e) {
    console.error("Erro no Analytics:", e.response?.data || e.message);
    res.status(500).json({ error: "Falha ao consultar AppDynamics" });
  }
}

// Lista logs de pesquisa por RA com filtros e paginação
export async function getSearchLogs(req, res) {
  try {
    const {
      ra,
      user_id: userIdParam,
      userId: userIdAlt,
      start,
      end,
      limit: limitParam,
      offset: offsetParam,
      order = "desc",
    } = req.query;

    const toMs = (value) => {
      const raw = isNaN(Number(value)) ? new Date(value).getTime() : Number(value);
      if (isNaN(raw)) return null;
      return raw < 1e12 ? raw * 1000 : raw;
    };

    const userId = userIdParam || userIdAlt;
    const limit = Math.max(0, Math.min(parseInt(limitParam) || 100, 1000));
    const offset = Math.max(0, parseInt(offsetParam) || 0);
    const ord = String(order).toLowerCase() === "asc" ? "asc" : "desc";

    const { rows, total } = await getSearchLogsDB({
      ra: ra || null,
      userId: userId || null,
      start: start ? toMs(start) : null,
      end: end ? toMs(end) : null,
      limit,
      offset,
      order: ord,
    });

    res.json({
      total,
      limit,
      offset,
      order: ord.toUpperCase(),
      results: rows,
    });
  } catch (e) {
    console.error("Erro ao buscar search_logs:", e.message);
    res.status(500).json({ error: "Falha ao consultar logs" });
  }
}

// Exporta logs em CSV
export async function exportSearchLogsCSV(req, res) {
  try {
    const {
      ra,
      user_id: userIdParam,
      userId: userIdAlt,
      start,
      end,
      order = "desc",
    } = req.query;

    const toMs = (value) => {
      const raw = isNaN(Number(value)) ? new Date(value).getTime() : Number(value);
      if (isNaN(raw)) return null;
      return raw < 1e12 ? raw * 1000 : raw;
    };

    const userId = userIdParam || userIdAlt;
    const ord = String(order).toLowerCase() === "asc" ? "asc" : "desc";

    const rows = await getAllSearchLogsDB({
      ra: ra || null,
      userId: userId || null,
      start: start ? toMs(start) : null,
      end: end ? toMs(end) : null,
      order: ord,
    });

    // Monta CSV
    const header = ['ra','user_id','ip','searched_at'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const vals = [r.ra, r.user_id, r.ip || '', r.searched_at];
      const safe = vals.map(v => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
      });
      lines.push(safe.join(','));
    }
    const csv = lines.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="search_logs.csv"');
    res.send(csv);
  } catch (e) {
    console.error("Erro ao exportar CSV:", e.message);
    res.status(500).json({ error: "Falha ao exportar CSV" });
  }
}
