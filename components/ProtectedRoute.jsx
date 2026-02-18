'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthed, isAdmin } from '@/lib/auth';

function ProtectedRoute({ children, adminOnly = false }) {
  const [authed, setAuthed] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const authStatus = isAuthed();
    setAuthed(authStatus);
    
    if (!authStatus) {
      router.push('/login');
      return;
    }

    if (adminOnly) {
      const adminStatus = isAdmin();
      setIsUserAdmin(adminStatus);
      
      if (!adminStatus) {
        router.push('/');
        return;
      }
    }

    setIsLoading(false);
  }, [router, adminOnly]);

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</div>;
  }

  if (!authed) {
    return null;
  }

  if (adminOnly && !isUserAdmin) {
    return null;
  }

  return children;
}

export default ProtectedRoute;
