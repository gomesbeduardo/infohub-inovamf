// Porta interna do Express. Fixa de propósito: os rewrites do Next são
// resolvidos no BUILD (viram routes-manifest.json), então uma env aqui seria
// lida na hora do build e ignorada em runtime — pegadinha silenciosa. Se mudar,
// mude junto em scripts/start-all.mjs.
const PORTA_API_INTERNA = 3333;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Front e API vivem no mesmo container (ver scripts/start-all.mjs): o Next
  // repassa /api/* para o Express local, então o browser fala só com o domínio
  // do front — uma porta exposta, nenhum CORS entre os dois.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://127.0.0.1:${PORTA_API_INTERNA}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
