'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthed } from '@/lib/auth';
import '@/styles/globals.css';

export default function RootLayout({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const authed = isAuthed();
    
    if (!authed && !pathname.includes('/login')) {
      router.push('/login');
    }
    
    setIsLoading(false);
  }, [pathname, router]);

  if (isLoading) {
    return (
      <html>
        <body>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            Carregando...
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
