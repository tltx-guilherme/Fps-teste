import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import ptBR from 'date-fns/locale/pt-BR';
import { apiGet } from '../utils/api';
import decorEsq from '../assets/decor-esq.svg';
import decorDir from '../assets/decor-dir.svg';
import logo from '../assets/logo-fps1.png';
import './Auditoria.css';

registerLocale('pt-BR', ptBR);

function formatAuditDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const AUDIT_CACHE_KEY = "fps_auditoria_cache_v1";

function readAuditCache() {
  try {
    const raw = sessionStorage.getItem(AUDIT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt) return null;

    // Mantém estado por até 2 horas para troca rápida entre páginas
    if ((Date.now() - Number(parsed.savedAt)) > 2 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCachedDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function Auditoria() {
  const initialCache = readAuditCache();
  const [logs, setLogs] = useState(() => initialCache?.logs || []);
  const [total, setTotal] = useState(() => initialCache?.total || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [exporting, setExporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(20);
  
  // Filtros
  const [ra, setRa] = useState(() => initialCache?.filters?.ra || '');
  const [userId, setUserId] = useState(() => initialCache?.filters?.userId || '');
  const [startDate, setStartDate] = useState(() => parseCachedDate(initialCache?.filters?.startDate));
  const [endDate, setEndDate] = useState(() => parseCachedDate(initialCache?.filters?.endDate));
  
  // Paginação
  const [page, setPage] = useState(() => initialCache?.page || 1);
  const [limit, setLimit] = useState(() => initialCache?.limit || 50);
  const [order, setOrder] = useState(() => initialCache?.order || 'desc');

  useEffect(() => {
    fetchLogs();
  }, [page, order, limit]);

  useEffect(() => {
    let refreshId;
    let countdownId;

    if (autoRefresh) {
      countdownId = setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? 20 : prev - 1));
      }, 1000);

      refreshId = setInterval(() => {
        fetchLogs();
      }, 20000);
    }

    return () => {
      if (refreshId) clearInterval(refreshId);
      if (countdownId) clearInterval(countdownId);
    };
  }, [autoRefresh, page, order, limit, ra, userId, startDate, endDate]);

  async function fetchLogs(overrides = {}) {
    const effectiveRa = (overrides.ra ?? ra).trim();
    const effectiveUserId = (overrides.userId ?? userId).trim();
    const effectiveStartDate = Object.prototype.hasOwnProperty.call(overrides, 'startDate') ? overrides.startDate : startDate;
    const effectiveEndDate = Object.prototype.hasOwnProperty.call(overrides, 'endDate') ? overrides.endDate : endDate;
    const effectivePage = overrides.page ?? page;
    const effectiveLimit = overrides.limit ?? limit;
    const effectiveOrder = overrides.order ?? order;

    setLoading(true);
    setError('');
    setWarning('');
    try {
      const params = new URLSearchParams();
      if (effectiveRa) params.set('ra', effectiveRa);
      if (effectiveUserId) params.set('userId', effectiveUserId);
      if (effectiveStartDate) params.set('start', effectiveStartDate.toISOString());
      if (effectiveEndDate) params.set('end', effectiveEndDate.toISOString());
      params.set('limit', effectiveLimit);
      params.set('offset', Math.max(0, (effectivePage - 1) * effectiveLimit));
      params.set('order', effectiveOrder);

      const data = await apiGet(`analytics/search-logs?${params.toString()}`);
      const nextLogs = Array.isArray(data.results) ? data.results : [];
      const nextTotal = data.total || 0;
      setLogs(nextLogs);
      setTotal(nextTotal);
      if (data.warning) {
        setWarning(data.warning);
      }
      setCountdown(20);
      sessionStorage.setItem(AUDIT_CACHE_KEY, JSON.stringify({
        logs: nextLogs,
        total: nextTotal,
        page: effectivePage,
        limit: effectiveLimit,
        order: effectiveOrder,
        filters: {
          ra: effectiveRa,
          userId: effectiveUserId,
          startDate: effectiveStartDate ? effectiveStartDate.toISOString() : null,
          endDate: effectiveEndDate ? effectiveEndDate.toISOString() : null
        },
        savedAt: Date.now()
      }));
    } catch (e) {
      setError(e?.message || 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    const normalizedRa = ra.trim();
    const normalizedUserId = userId.trim();
    if (normalizedRa !== ra) setRa(normalizedRa);
    if (normalizedUserId !== userId) setUserId(normalizedUserId);

    const shouldFetchNow = page === 1;
    setPage(1);
    if (shouldFetchNow) {
      fetchLogs({ page: 1, ra: normalizedRa, userId: normalizedUserId });
    }
  }

  async function handleExportCSV() {
    try {
      setExporting(true);
      const raValue = ra.trim();
      const userValue = userId.trim();
      const params = new URLSearchParams();
      if (raValue) params.set('ra', raValue);
      if (userValue) params.set('userId', userValue);
      if (startDate) params.set('start', startDate.toISOString());
      if (endDate) params.set('end', endDate.toISOString());
      params.set('order', order);

      const token = localStorage.getItem('fps_token');
      // Usa a mesma origem do window para evitar problemas de CORS
      const url = `${window.location.origin}/api/analytics/search-logs.csv?${params.toString()}`;
      
      console.log('📥 Exportando CSV:', url);

      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/csv'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();
      const objUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objUrl;
      link.download = `search_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objUrl);
      
      console.log('✅ CSV exportado com sucesso');
    } catch (err) {
      console.error('❌ Erro ao exportar CSV:', err);
      alert('Erro ao exportar CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  function handleClearFilters() {
    setRa('');
    setUserId('');
    setStartDate(null);
    setEndDate(null);
    const shouldFetchNow = page === 1;
    setPage(1);
    if (shouldFetchNow) {
      fetchLogs({
        ra: '',
        userId: '',
        startDate: null,
        endDate: null,
        page: 1
      });
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <img src={decorEsq} alt="" className="fixed top-0 left-0 h-[60vh] w-auto opacity-10 pointer-events-none z-0" />
      <img src={decorDir} alt="" className="fixed bottom-0 right-0 h-[60vh] w-auto opacity-10 pointer-events-none z-0 transform rotate-180" />
      
      <header className="bg-[#115b2a] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="FPS" className="h-10 w-auto" />
              <div>
                <h1 className="text-xl font-semibold text-white">Auditoria de Pesquisas</h1>
                <p className="text-xs text-white/80">Histórico de consultas por RA</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Voltar</span>
              </Link>
              
              <button onClick={() => localStorage.clear() || window.location.reload()} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm">
                <span className="hidden sm:inline">Sair</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-[#115b2a] mb-4">Filtros de Busca</h2>
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RA</label>
              <input type="text" value={ra} onChange={(e) => setRa(e.target.value)} placeholder="12345"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#115b2a] focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
              <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user_id"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#115b2a] focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                locale="pt-BR"
                placeholderText="Selecione data e hora"
                className="custom-datepicker-input"
                wrapperClassName="custom-datepicker w-full"
                calendarClassName="custom-datepicker"
                todayButton="Hoje"
                isClearable
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                locale="pt-BR"
                placeholderText="Selecione data e hora"
                className="custom-datepicker-input"
                wrapperClassName="custom-datepicker w-full"
                calendarClassName="custom-datepicker"
                todayButton="Hoje"
                isClearable
                minDate={startDate}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4 flex flex-col gap-3">
              <div className="flex gap-3">
                <button type="submit" className="px-6 py-2 bg-[#115b2a] hover:bg-[#0d4621] text-white rounded-lg transition-colors font-medium">
                  Buscar
                </button>
                <button type="button" onClick={handleClearFilters} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                  Limpar
                </button>
              </div>
              
              <div className="border-t pt-3 mt-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold text-[#115b2a]"> Exportar CSV:</span> {' '}
                    {startDate || endDate || ra || userId ? (
                      <span>Exportará os dados <strong>filtrados</strong> conforme período e campos preenchidos acima</span>
                    ) : (
                      <span>Exportará <strong>todos os dados</strong> (sem filtros). Use os campos acima para filtrar por período</span>
                    )}
                  </div> 
                  <button 
                    type="button" 
                    onClick={handleExportCSV} 
                    disabled={exporting}
                    className="px-6 py-2 bg-[#115b2a] hover:bg-[#0d4621] text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {exporting ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Exportando...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Exportar CSV
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-gray-600">Total: <span className="font-bold text-gray-800">{total}</span> registros</span>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Ordem:</label>
              <select value={order} onChange={(e) => setOrder(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#115b2a] focus:outline-none transition-colors font-medium">
                <option value="desc">Mais recentes</option>
                <option value="asc">Mais antigas</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Por página:</label>
              <select
                value={limit}
                onChange={(e) => {
                  const nextLimit = Number(e.target.value) || 50;
                  const shouldFetchNow = page === 1;
                  setLimit(nextLimit);
                  setPage(1);
                  if (shouldFetchNow) {
                    fetchLogs({ page: 1, limit: nextLimit });
                  }
                }}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#115b2a] focus:outline-none transition-colors font-medium"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                autoRefresh
                  ? 'bg-[#115b2a] text-white border-[#115b2a] hover:bg-[#0d4621]'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
              type="button"
            >
              <span>{autoRefresh ? `Atualiza em ${countdown}s` : 'Auto-refresh pausado'}</span>
            </button>
            <button
              onClick={() => fetchLogs()}
              disabled={loading}
              className="p-2 rounded-lg border-2 border-gray-300 hover:border-[#115b2a] hover:bg-gray-50 transition-all disabled:opacity-50"
              type="button"
              title="Atualizar agora"
            >
              <svg className={`w-5 h-5 text-gray-700 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {warning && <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 font-medium">{warning}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 font-medium">{error}</div>}

        {!loading && logs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 font-medium">
            Nenhum registro encontrado
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden relative">
            <div className="bg-[#115b2a] px-4 py-3 shadow-sm">
              <h3 className="text-lg font-bold text-white tracking-tight">Registros de Auditoria</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">RA</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Usuário</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && logs.length === 0
                    ? Array.from({ length: 8 }).map((_, idx) => (
                        <tr key={`skeleton-${idx}`} className="animate-pulse">
                          <td className="px-4 py-3"><div className="h-4 w-10 bg-gray-200 rounded"></div></td>
                          <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
                          <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded"></div></td>
                          <td className="px-4 py-3"><div className="h-4 w-28 bg-gray-200 rounded"></div></td>
                          <td className="px-4 py-3"><div className="h-4 w-40 bg-gray-200 rounded"></div></td>
                        </tr>
                      ))
                    : logs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#115b2a]/5 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-600 font-medium">{log.id}</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">{log.ra || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">{log.user_id || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono">{log.ip || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-medium">{formatAuditDate(log.searched_at)}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {loading && logs.length > 0 && (
              <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px] pointer-events-none flex items-start justify-center pt-6">
                <div className="bg-white border border-[#115b2a]/20 text-[#115b2a] text-sm font-semibold px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#115b2a] animate-pulse"></span>
                  Atualizando tabela...
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600 font-medium">Página {page} de {totalPages}</div>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-[#115b2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Anterior
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-[#115b2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 mt-6 relative z-10">
        <div className="text-center text-xs text-gray-500">
          <p>© 2025 FPS - Sistema de Analytics</p>
        </div>
      </footer>
    </div>
  );
}
