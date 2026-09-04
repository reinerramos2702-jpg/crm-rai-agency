import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'CRM RAI Agency — Pipeline de Automatización de Contenido',
  description:
    'Genera campañas de contenido completas con IA: copy, imágenes, vídeos y publicación automática en Instagram.',
  keywords: ['contenido', 'automatización', 'IA', 'instagram', 'marketing', 'RAI Agency'],
};

/**
 * Layout global con Sidebar fijo y área de contenido principal.
 * Aplica la paleta RAI a toda la app.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0A0A0F" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#EAE0C8" media="(prefers-color-scheme: light)" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rai-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <div className="app-layout">
          <Sidebar />
          <main className="app-main">{children}</main>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--rai-card)',
              color: 'var(--rai-text)',
              border: '1px solid var(--rai-border)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: 'var(--rai-success)',
                secondary: 'var(--rai-card)',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--rai-error)',
                secondary: 'var(--rai-card)',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
