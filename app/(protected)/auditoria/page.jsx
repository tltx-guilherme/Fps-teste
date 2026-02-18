'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

export default function AuditoriaPage() {
  return (
    <ProtectedRoute adminOnly>
      <div style={{ padding: '2rem' }}>
        <h1>Auditoria</h1>
        <p>Logs de acesso e auditoria do sistema</p>
        {/* Adicione seus componentes de auditoria aqui */}
      </div>
    </ProtectedRoute>
  );
}
