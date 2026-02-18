// Exemplo de como chamar as APIs no frontend Next.js

/* 1. AUTENTICAÇÃO */

// Login
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    throw new Error('Login failed');
  }
  
  const { token } = await response.json();
  localStorage.setItem('fps_token', token);
  return token;
}

// Logout
function logout() {
  localStorage.removeItem('fps_token');
}

// Verificar autenticação
function getToken() {
  return localStorage.getItem('fps_token');
}

/* 2. ANALYTICS */

// Buscar estatísticas gerais
async function getStats(days = 7) {
  const token = getToken();
  const response = await fetch(`/api/analytics/stats?days=${days}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
}

// Buscar por RA específico
async function searchByRA(ra) {
  const token = getToken();
  const response = await fetch(`/api/analytics/search/${ra}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) throw new Error('Failed to search');
  return response.json();
}

// Buscar logs de auditoria (admin only)
async function getAuditLogs(limit = 100, offset = 0) {
  const token = getToken();
  const response = await fetch(
    `/api/analytics/logs?limit=${limit}&offset=${offset}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  if (!response.ok) throw new Error('Failed to fetch logs');
  return response.json();
}

/* 3. SINCRONIZAÇÃO */

// Forçar sincronização
async function syncNow(limit = 50000) {
  const token = getToken();
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ limit, force: true })
  });
  
  if (!response.ok) throw new Error('Sync failed');
  return response.json();
}

// Verificar status de sincronização
async function getSyncStatus() {
  const response = await fetch('/api/sync/status');
  if (!response.ok) throw new Error('Failed to get sync status');
  return response.json();
}

/* 4. IMPORTAÇÃO */

// Importar dados
async function importData(transactions, searchLogs, syncMeta) {
  const token = getToken();
  const response = await fetch('/api/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      transactions,
      searchLogs,
      syncMeta
    })
  });
  
  if (!response.ok) throw new Error('Import failed');
  return response.json();
}

/* 5. USO EM COMPONENTES REACT */

// Exemplo de componente que usa as APIs:

import { useState, useEffect } from 'react';

export function StatsComponent() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await getStats(7);
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!stats) return <div>Sem dados</div>;

  return (
    <div>
      <h2>Estatísticas (últimos 7 dias)</h2>
      <p>Total de eventos: {stats.totalEventos}</p>
      <p>Horários mais usados: {JSON.stringify(stats.horariosMaisUsados)}</p>
      <p>Recursos mais usados: {JSON.stringify(stats.recursosMaisUsados)}</p>
    </div>
  );
}

export {
  login,
  logout,
  getToken,
  getStats,
  searchByRA,
  getAuditLogs,
  syncNow,
  getSyncStatus,
  importData
};
