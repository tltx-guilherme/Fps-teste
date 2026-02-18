import { jsonResponse, errorResponse, getQueryParam } from '@/lib/api-utils';
import { getLocalStats } from '@/lib/db';

// Função para categorizar URLs
function categorizeUrl(url, urlResumida) {
  const lower = (url || urlResumida || '').toLowerCase();
  
  if (lower.includes('boletim') || lower.includes('notas')) return 'Boletim';
  if (lower.includes('frequencia') || lower.includes('presenca')) return 'Frequência';
  if (lower.includes('avisos')) return 'Avisos';
  if (lower.includes('atividades') || lower.includes('tarefas')) return 'Atividades';
  if (lower.includes('foto') || lower.includes('perfil')) return 'Foto/Perfil';
  if (lower.includes('pix') || lower.includes('financeiro')) return 'Financeiro';
  if (lower.includes('login') || lower.includes('auth')) return 'Autenticação';
  if (lower.includes('tema') || lower.includes('config')) return 'Configuração';
  if (lower.includes('home') || lower.includes('dashboard')) return 'Página Inicial';
  if (lower.includes('mensag') || lower.includes('chat')) return 'Mensagens';
  if (lower.includes('video') || lower.includes('aula')) return 'Vídeos/Aulas';
  
  return 'Navegação Geral';
}

// GET /api/analytics/stats
export async function GET(request) {
  try {
    const limit = getQueryParam(request, 'limit') || 100000;
    const days = parseInt(getQueryParam(request, 'days')) || 7;
    const source = getQueryParam(request, 'source');
    
    const localData = await getLocalStats({ 
      limit: limit === 'all' ? Infinity : parseInt(limit), 
      daysAgo: days 
    });
    
    if (!localData || localData.length === 0) {
      return jsonResponse({
        horariosMaisUsados: [],
        recursosMaisUsados: [],
        totalEventos: 0
      });
    }
    
    // Processa dados
    const horarios = {};
    const recursos = {};
    const healthStats = { normal: 0, slow: 0, error: 0 };
    
    localData.forEach(r => {
      // Hora do dia
      const date = new Date(r.horario);
      const hora = date.getHours();
      horarios[hora] = (horarios[hora] || 0) + 1;
      
      // Categoriza URL
      const categoria = categorizeUrl(r.url, r.url_resumida);
      recursos[categoria] = (recursos[categoria] || 0) + 1;
      
      // Saúde
      const saude = (r.saude || '').toUpperCase();
      if (saude === 'ERROR') healthStats.error++;
      else if (saude === 'SLOW' || saude === 'VERY_SLOW') healthStats.slow++;
      else healthStats.normal++;
    });
    
    // Converte para arrays
    const horariosMaisUsados = Array.from({ length: 24 }, (_, i) => ({
      hora: i,
      acessos: horarios[i] || 0
    }));
    
    const recursosMaisUsados = Object.entries(recursos)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
    
    return jsonResponse({
      horariosMaisUsados,
      recursosMaisUsados,
      totalEventos: localData.length,
      healthStats
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
