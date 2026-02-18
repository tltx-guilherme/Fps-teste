import '@/app/styles/globals.css';

export const metadata = {
  title: 'FPS Interface',
  description: 'Sistema de Monitoramento de Performance',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
