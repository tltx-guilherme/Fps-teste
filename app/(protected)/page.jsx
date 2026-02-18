'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem' }}>
        <h1>Dashboard</h1>
        <p>Bem-vindo ao sistema FPS Interface!</p>
        {/* Adicione seus componentes do dashboard aqui */}
      </div>
    </ProtectedRoute>
  );
}
