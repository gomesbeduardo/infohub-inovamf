// Busca (RF-07). O schema indexa `equipes.nome_ideia` com
// gin(to_tsvector('portuguese', ...)). Logo a busca é full-text português via
// plainto_tsquery no model (com $queryRaw), NÃO unaccent/pg_trgm (que não
// existem no schema). Ver ENTITIES.md §3.
//
// Aqui só sanitizamos o termo cru vindo de ?q=: trim, colapsa espaços e limita
// tamanho. Retorna null quando não há termo útil (o model ignora o filtro).
export function normalizarBusca(q: unknown): string | null {
  if (typeof q !== "string") return null;
  const limpo = q.trim().replace(/\s+/g, " ").slice(0, 120);
  return limpo.length === 0 ? null : limpo;
}

// Entrega por link (v1): só aceita URL https bem formada e ≤500 chars
// (limite de arquivos_entrega.url_externa). Ver plan-backend.md §8.
export function ehUrlHttps(v: unknown): v is string {
  if (typeof v !== "string" || v.length === 0 || v.length > 500) return false;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}
