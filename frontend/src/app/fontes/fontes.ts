import localFont from 'next/font/local';

/*
 * Fontes servidas do próprio app (subconjunto latino, que cobre o português).
 * Antes vinham de next/font/google, que baixa do Google no build: quando a
 * rede do servidor de deploy falhava, o build quebrava ("An error occurred in
 * `next/font`"). Arquivos variáveis, licença SIL OFL.
 */

export const fonteDisplay = localFont({
  src: './space-grotesk.woff2',
  weight: '500 700',
  variable: '--font-display',
  display: 'swap',
});

export const fonteCorpo = localFont({
  src: './inter.woff2',
  weight: '400 600',
  variable: '--font-body',
  display: 'swap',
});

/** Letra de mão do esboço no hero da landing. */
export const fonteRascunho = localFont({
  src: './caveat.woff2',
  weight: '500',
  display: 'swap',
});
