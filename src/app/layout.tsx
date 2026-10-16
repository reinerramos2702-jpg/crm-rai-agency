import type { Metadata } from 'next';
import './globals.css';
import '../styles/effects.css';
import '../styles/select.css';
import { Sidebar } from '@/components/layout/Sidebar';
import TourHost from '@/components/tour/TourHost';
import { ClickFx } from '@/components/ui/ClickFx';
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
            __html: `(function(){try{var t=localStorage.getItem('rai-theme');if(t)document.documentElement.setAttribute('data-theme',t);if(localStorage.getItem('rai-sidebar-collapsed-v1')==='1')document.documentElement.setAttribute('data-sidebar','collapsed')}catch(e){}})()`,
          }}
        />
        {/* Transición suave SOLO durante el cambio de tema: añade `theme-anim` a <html> 350 ms cuando cambia data-theme (el CSS no tiene transiciones universales permanentes). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement,t;new MutationObserver(function(){r.classList.add('theme-anim');clearTimeout(t);t=setTimeout(function(){r.classList.remove('theme-anim')},350)}).observe(r,{attributes:true,attributeFilter:['data-theme']})}catch(e){}})()`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('rai-density-v1');if(d==='compact'||d==='comfortable'||d==='spacious')document.documentElement.setAttribute('data-density',d)}catch(e){}})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <div className="app-layout">
          <Sidebar />
          <main className="app-main">{children}</main>
        </div>
        <TourHost />
        <ClickFx />
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
