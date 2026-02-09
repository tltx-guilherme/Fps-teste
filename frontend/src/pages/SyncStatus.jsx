import { useState, useEffect } from "react";
import { apiGet } from "../utils/api";

export default function SyncStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function loadStatus() {
    try {
      setLoading(true);
      const data = await apiGet('sync/status');
      setStatus(data);
    } catch (e) {
      console.error('Erro ao carregar status:', e);
    } finally {
      setLoading(false);
    }
  }

  async function forceSync() {
    try {
      setSyncing(true);
      const response = await fetch('http://192.168.252.36:4001/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          limit: 50000,
          daysAgo: 30,
          force: true
        })
      });
      const result = await response.json();
      console.log('Sincronização:', result);
      await loadStatus();
    } catch (e) {
      console.error('Erro ao sincronizar:', e);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#115b2a]"></div>
          <p className="text-gray-600 mt-2">Carregando status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Status da Sincronização</h2>
          <button
            onClick={forceSync}
            disabled={syncing}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              syncing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#115b2a] text-white hover:bg-[#0d4621]'
            }`}
          >
            {syncing ? (
              <>
                <svg className="inline-block w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sincronizando...
              </>
            ) : (
              <>
                <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Forçar Sincronização
              </>
            )}
          </button>
        </div>

        {status && (
          <div className="space-y-4">
            {/* Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border-2 ${
                status.sync_status === 'success' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className={`text-2xl font-bold ${
                  status.sync_status === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status.sync_status === 'success' ? '✓ Sucesso' : '✗ Erro'}
                </p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Registros no Banco</p>
                <p className="text-2xl font-bold text-blue-600">
                  {status.currentRecords?.toLocaleString() || 0}
                </p>
              </div>

              <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Última Sincronização</p>
                <p className="text-lg font-bold text-gray-800">
                  {status.last_sync 
                    ? new Date(status.last_sync).toLocaleString('pt-BR')
                    : 'Nunca'
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {status.last_sync 
                    ? `Há ${Math.round((Date.now() - status.last_sync) / 60000)} minutos`
                    : ''
                  }
                </p>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {status.error_message && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800 mb-1">Mensagem de Erro:</p>
                <p className="text-sm text-red-600">{status.error_message}</p>
              </div>
            )}

            {/* Informações Adicionais */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">ℹ️ Informações</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• A sincronização ocorre automaticamente a cada 10 minutos</li>
                <li>• Mantém até 30 dias de histórico no banco local</li>
                <li>• Usa banco SQLite para consultas ultra-rápidas</li>
                <li>• Fallback automático para AppDynamics se necessário</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
