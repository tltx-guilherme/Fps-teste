import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../utils/api";
import { isAdmin } from "../utils/auth";
import decorEsq from "../assets/decor-esq.svg";
import decorDir from "../assets/decor-dir.svg";
import logo from "../assets/logo-fps1.png";
import Stats from "./Stats";
import './Dashboard.css';

// Componente Dropdown Customizado
function CustomDropdown({ options, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
 
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="custom-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="custom-dropdown-label">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`custom-dropdown-arrow ${isOpen ? 'open' : ''}`}
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="custom-dropdown-menu">
          {options.map((option, idx) => (
            <div
              key={idx}
              className={`custom-dropdown-item ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Funções auxiliares para cores - paleta minimalista
function getCategoryColor(categoria) {
  const colors = {
    "Boletim": "bg-[#115b2a] text-white",
    "Frequência": "bg-[#115b2a] text-white",
    "Avisos": "bg-[#115b2a] text-white",
    "Atividades": "bg-[#115b2a] text-white",
    "Foto/Perfil": "bg-[#115b2a] text-white",
    "LGPD/Termos": "bg-gray-600 text-white",
    "Financeiro": "bg-[#115b2a] text-white",
    "Autenticação": "bg-[#115b2a] text-white",
    "Transações": "bg-[#115b2a] text-white",
    "Configuração": "bg-gray-600 text-white",
    "Página Inicial": "bg-[#115b2a] text-white",
    "Mensagens": "bg-[#115b2a] text-white",
    "Calendário": "bg-[#115b2a] text-white",
    "Biblioteca": "bg-[#115b2a] text-white",
    "Vídeos/Aulas": "bg-[#115b2a] text-white",
    "Navegação Geral": "bg-gray-500 text-white"
  };
  return colors[categoria] || colors["Navegação Geral"];
}

function getHealthColor(saude) {
  const colors = {
    "NORMAL": "bg-green-50 text-[#115b2a] border border-green-200",
    "SLOW": "bg-amber-50 text-amber-700 border border-amber-200",
    "ERROR": "bg-red-50 text-red-700 border border-red-200"
  };
  return colors[saude] || "bg-gray-50 text-gray-600 border border-gray-200";
}

function getHealthLabel(saude) {
  const labels = {
    "NORMAL": "Normal",
    "SLOW": "Lento",
    "ERROR": "Erro"
  };
  return labels[saude] || saude;
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-8 w-48 bg-gray-200 rounded mb-3"></div>
        <div className="h-5 w-64 bg-gray-100 rounded"></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="h-10 bg-gray-100 rounded-lg"></div>
          <div className="h-10 bg-gray-100 rounded-lg"></div>
          <div className="h-10 bg-gray-100 rounded-lg"></div>
          <div className="h-10 bg-gray-100 rounded-lg"></div>
          <div className="h-10 bg-gray-100 rounded-lg"></div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="h-12 bg-gray-100 border-b border-gray-200"></div>
        <div className="p-4 space-y-3">
          <div className="h-14 bg-gray-100 rounded-lg"></div>
          <div className="h-14 bg-gray-100 rounded-lg"></div>
          <div className="h-14 bg-gray-100 rounded-lg"></div>
          <div className="h-14 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

const DASHBOARD_CACHE_KEY = "fps_dashboard_search_cache_v1";
const DASHBOARD_TAB_KEY = "fps_dashboard_active_tab_v1";

function readDashboardSearchCache() {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || !parsed?.ra || !parsed?.data) return null;

    // Mantém cache por até 6 horas para navegação fluida entre páginas
    if ((Date.now() - Number(parsed.savedAt)) > 6 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readDashboardTabCache() {
  try {
    const tab = sessionStorage.getItem(DASHBOARD_TAB_KEY);
    return tab === "stats" || tab === "search" ? tab : "search";
  } catch {
    return "search";
  }
}

export default function Dashboard() {
  const initialSearchCache = readDashboardSearchCache();
  const [activeTab, setActiveTab] = useState(readDashboardTabCache); // 'search' ou 'stats'
  const [ra, setRa] = useState(() => initialSearchCache?.ra || "");
  const [data, setData] = useState(() => initialSearchCache?.data || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedHealth, setSelectedHealth] = useState("Todos");
  const [order, setOrder] = useState("desc");
  const [timePeriod, setTimePeriod] = useState("all");
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  // Verifica se é admin quando o componente monta
  useEffect(() => {
    setUserIsAdmin(isAdmin());
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DASHBOARD_TAB_KEY, activeTab);
    } catch {
      // noop
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      if (!data || !ra) return;
      sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
        ra,
        data,
        savedAt: Date.now()
      }));
    } catch {
      // noop
    }
  }, [data, ra]);

  async function handleSearch() {
    const normalizedRa = ra.trim();
    if (!normalizedRa) {
      setError("Digite o RA do aluno");
      return;
    }

    setRa(normalizedRa);
    setError("");
    setLoading(true);
    setSelectedCategory("Todos");
    setSelectedHealth("Todos");

    try {
      const result = await apiGet(`analytics/search/${encodeURIComponent(normalizedRa)}`);
      setData(result);
      
      if (result.totalEventos === 0) {
        setError("Nenhum acesso encontrado para este RA");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao buscar dados. Verifique o RA ou tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  // Filtra e ordena eventos com base nos filtros selecionados
  let filteredEvents = data?.eventos?.filter((ev) => {
    const categoryMatch = selectedCategory === "Todos" || ev.categoria === selectedCategory;
    const healthMatch = selectedHealth === "Todos" || ev.saude === selectedHealth;
    
    // Filtro por período de tempo
    let timeMatch = true;
    if (timePeriod !== "all") {
      const eventTime = new Date(ev.horario).getTime();
      const now = Date.now();
      const hourInMs = 3600000;
      const dayInMs = 86400000;
      
      if (timePeriod === "24h") {
        timeMatch = (now - eventTime) <= (24 * hourInMs);
      } else if (timePeriod === "7d") {
        timeMatch = (now - eventTime) <= (7 * dayInMs);
      } else if (timePeriod === "30d") {
        timeMatch = (now - eventTime) <= (30 * dayInMs);
      }
    }
    
    return categoryMatch && healthMatch && timeMatch;
  }) || [];

  // Ordena eventos conforme seleção
  filteredEvents = filteredEvents.slice().sort((a, b) => {
    const tA = new Date(a.horario).getTime();
    const tB = new Date(b.horario).getTime();
    return order === "desc" ? tB - tA : tA - tB;
  });

  // Categorias disponíveis
  const categories = data?.categorias ? Object.keys(data.categorias).sort() : [];
  const hasSearchResult = Boolean(data);
  const hasEvents = (data?.totalEventos || 0) > 0;

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Decorações laterais */}
      <img src={decorEsq} alt="" className="fixed top-0 left-0 h-[60vh] w-auto opacity-10 pointer-events-none z-0" />
      <img src={decorDir} alt="" className="fixed bottom-0 right-0 h-[60vh] w-auto opacity-10 pointer-events-none z-0 transform rotate-180" />
      
      {/* Header minimalista */}
      <header className="bg-[#115b2a] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="FPS" className="h-10 w-auto" />
              <div>
                <h1 className="text-xl font-semibold text-white">FPS Analytics</h1>
                <p className="text-xs text-white/80">Sistema de Consulta de Acessos</p>
              </div>
            </div>
            
            {/* Navegação entre abas */}
            <div className="flex items-center gap-3">
              {userIsAdmin && (
                <Link
                  to="/auditoria"
                  className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white text-[#115b2a] shadow-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  title="Auditoria"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Auditoria</span>
                </Link>
              )}
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("search")}
                  className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${
                    activeTab === "search"
                      ? "bg-white text-[#115b2a] shadow-md"
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Pesquisa</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("stats")}
                  className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${
                    activeTab === "stats"
                      ? "bg-white text-[#115b2a] shadow-md"
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Estatísticas</span>
                  </div>
                </button>
              </div>
              
              {/* Botões mobile */}
              <div className="flex sm:hidden gap-2">
                {userIsAdmin && (
                  <Link
                    to="/auditoria"
                    className="p-2 rounded-lg transition-all bg-white text-[#115b2a]"
                    title="Auditoria"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </Link>
                )}
                <button
                  onClick={() => setActiveTab("search")}
                  className={`p-2 rounded-lg transition-all ${
                    activeTab === "search"
                      ? "bg-white text-[#115b2a]"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  title="Pesquisa"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab("stats")}
                  className={`p-2 rounded-lg transition-all ${
                    activeTab === "stats"
                      ? "bg-white text-[#115b2a]"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  title="Estatísticas"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
              </div>
              
              <button
                onClick={() => localStorage.clear() || window.location.reload()}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm"
              >
                <span className="hidden sm:inline">Sair</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Container principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className={activeTab === "stats" ? "block" : "hidden"}>
          <Stats isActive={activeTab === "stats"} />
        </div>

        <div className={activeTab === "search" ? "block" : "hidden"}>
        {/* Busca minimalista */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={ra}
              onChange={(e) => setRa(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite o RA do aluno (ex: 2024210031)"
              maxLength="15"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#115b2a] focus:outline-none transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-3 bg-[#115b2a] hover:bg-[#0d4621] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
          
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
        
        {/* Resultados */}
        <div className="relative">
          {loading && !hasSearchResult && <SearchResultsSkeleton />}

          {hasEvents && (
            <>
              {/* Informações do aluno */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-extrabold text-[#115b2a] mb-2 tracking-tight drop-shadow-sm">RA: {ra}</h2>
                    {data.ultimoAcesso && (
                      <p className="text-base text-gray-500 font-medium">
                        Último acesso: {new Date(data.ultimoAcesso).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    )}
                  </div>
                  {/* Estatísticas inline */}
                  <div className="flex gap-6 text-base">
                    <div className="flex flex-col items-center">
                      <div className="text-3xl font-extrabold text-gray-900 drop-shadow-sm">{data.totalEventos}</div>
                      <div className="text-gray-500 font-semibold">Total</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-3xl font-extrabold text-[#115b2a] drop-shadow-sm">{data.estatisticas.normal}</div>
                      <div className="text-gray-500 font-semibold">Normal</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-3xl font-extrabold text-amber-600 drop-shadow-sm">{data.estatisticas.slow}</div>
                      <div className="text-gray-500 font-semibold">Lento</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-3xl font-extrabold text-red-600 drop-shadow-sm">{data.estatisticas.error}</div>
                      <div className="text-gray-500 font-semibold">Erro</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtros minimalistas */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-row flex-wrap gap-2 sm:gap-4 items-center flex-1">
                    <CustomDropdown
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      placeholder="Todas categorias"
                      options={[
                        { value: 'Todos', label: `Todas categorias (${data.totalEventos})` },
                        ...categories.map(cat => ({
                          value: cat,
                          label: `${cat} (${data.categorias[cat]})`
                        }))
                      ]}
                    />

                    <CustomDropdown
                      value={selectedHealth}
                      onChange={setSelectedHealth}
                      placeholder="Todos status"
                      options={[
                        { value: 'Todos', label: 'Todos status' },
                        { value: 'NORMAL', label: `Normal (${data.estatisticas.normal})` },
                        { value: 'SLOW', label: `Lento (${data.estatisticas.slow})` },
                        { value: 'ERROR', label: `Erro (${data.estatisticas.error})` }
                      ]}
                    />

                    <CustomDropdown
                      value={timePeriod}
                      onChange={setTimePeriod}
                      placeholder="Todos os períodos"
                      options={[
                        { value: 'all', label: 'Todos os períodos' },
                        { value: '24h', label: 'Últimas 24h' },
                        { value: '7d', label: 'Últimos 7 dias' },
                        { value: '30d', label: 'Últimos 30 dias' },
                        { value: '90d', label: 'Últimos 90 dias' },
                        { value: '180d', label: 'Últimos 6 meses' },
                        { value: '365d', label: 'Último ano' }
                      ]}
                    />

                    {/* Botão de ordenação com mesmo estilo dos dropdowns */}
                    <div className="w-full sm:w-auto flex items-center">
                      <button
                        type="button"
                        className="w-full sm:w-auto px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-semibold border-2 border-[#115b2a] transition-all duration-150 flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm hover:shadow-md active:scale-95 bg-white text-[#115b2a] hover:bg-gray-50"
                        onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
                        title={order === 'desc' ? 'Mostrar mais antigos' : 'Mostrar recentes'}
                        style={{ minWidth: 0 }}
                      >
                        <span className="truncate">{order === 'desc' ? 'Recentes' : 'Mais antigos'}</span>
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {order === 'desc'
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 15l-7-7-7 7" />}
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* Registros: embaixo no mobile, ao lado do botão em desktop */}
                  <div className="text-sm text-gray-500 w-full sm:w-auto mt-2 sm:mt-0 font-semibold">
                    {filteredEvents.length} de {data.totalEventos} registros
                  </div>
                </div>
              </div>

              {/* Lista de acessos moderna */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-[#115b2a] px-4 py-3 shadow-sm">
                  <h3 className="text-lg font-bold text-white tracking-tight">Histórico de Acessos</h3>
                </div>

                <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
                  {filteredEvents.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500 text-base mb-1 font-semibold">Nenhum registro encontrado</p>
                      <p className="text-sm text-gray-400">Ajuste os filtros selecionados</p>
                    </div>
                  ) : (
                    filteredEvents.map((ev, idx) => (
                      <div key={idx} className="p-4 group transition-all duration-150 hover:bg-[#115b2a]/5 hover:shadow-md">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getCategoryColor(ev.categoria)} shadow-sm`}>
                                {ev.categoria}
                              </span>
                              <span className="text-sm font-semibold text-gray-600">
                                {new Date(ev.horario).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                            <div className="text-base text-gray-700 mb-1 font-medium">
                              {ev.urlResumida || "Endpoint não categorizado"}
                            </div>
                            <div className="text-xs text-gray-400 font-mono break-all">
                              {ev.urlPrincipal}
                            </div>

                            {ev.erro && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold shadow-sm">
                                {ev.erro}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm ${getHealthColor(ev.saude)}`}
                              style={{ letterSpacing: "0.03em" }}>
                              {getHealthLabel(ev.saude)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {hasSearchResult && !hasEvents && !loading && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum acesso encontrado</h3>
              <p className="text-sm text-gray-500">Tente outro RA ou ajuste o número pesquisado</p>
            </div>
          )}

          {!loading && !hasSearchResult && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Digite um RA para começar</h3>
              <p className="text-sm text-gray-500">O histórico de acessos será exibido aqui</p>
            </div>
          )}

          {loading && hasSearchResult && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-lg pointer-events-none flex items-start justify-center pt-6">
              <div className="bg-white border border-[#115b2a]/20 text-[#115b2a] text-sm font-semibold px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#115b2a] animate-pulse"></span>
                Atualizando dados...
              </div>
            </div>
          )}
        </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 mt-6">
        <div className="text-center text-xs text-gray-500">
          <p>© 2025 FPS - Sistema de Analytics</p>
        </div>
      </footer>
    </div>
  );
}
