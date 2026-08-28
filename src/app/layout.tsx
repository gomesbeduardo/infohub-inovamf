import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider, type Theme } from '@/design-system/theme';
import { StoreProvider } from '@/data/store';

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
  title: 'InfoHub → InovAMF',
  description:
    'Acompanhamento do funil de ideias empreendedoras InfoHub → InovAMF',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // tema vindo do cookie, aplicado no SSR — sem flash entre sessões
  const theme: Theme =
    cookies().get('infohub-theme')?.value === 'dark' ? 'dark' : 'light';

  return (
    <html
      lang="pt-BR"
      data-theme={theme}
      className={`${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider initialTheme={theme}>
          <StoreProvider>{children}</StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
