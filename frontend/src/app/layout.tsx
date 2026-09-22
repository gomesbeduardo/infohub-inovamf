import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import {
  ThemeProvider,
  type Theme,
  type ThemePreference,
} from '@/design-system/theme';
import { StoreProvider } from '@/data/store';
import { Providers } from '@/data/api/Providers';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'InfoHub',
  description:
    'InfoHub — acompanhamento do funil de ideias empreendedoras da AMF',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f4' },
    { media: '(prefers-color-scheme: dark)', color: '#141110' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // preferência vinda do cookie; o padrão (sem cookie) é seguir o sistema.
  const jar = cookies();
  const bruta = jar.get('infohub-theme')?.value;
  const preference: ThemePreference =
    bruta === 'light' || bruta === 'dark' || bruta === 'system' ? bruta : 'system';

  // tema já resolvido na última visita — evita flash quando a preferência é
  // `system`; o script inline abaixo corrige antes da pintura se o SO mudou.
  const resolvido = jar.get('infohub-theme-resolvido')?.value;
  const theme: Theme =
    preference === 'system'
      ? resolvido === 'light'
        ? 'light'
        : 'dark'
      : preference;

  return (
    <html
      lang="pt-BR"
      data-theme={theme}
      className={`${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          // aplica o tema do sistema antes da pintura quando a preferência é
          // `system` (ou na primeira visita, sem cookie algum).
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem('infohub-theme')||'system';if(p!=='light'&&p!=='dark')p='system';var t=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider initialPreference={preference} initialTheme={theme}>
          <Providers>
            <StoreProvider>{children}</StoreProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
