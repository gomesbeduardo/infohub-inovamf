// Validação de e-mail (fonte única — usada pelos controllers).
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ehEmail(v: unknown): v is string {
  return typeof v === "string" && EMAIL_RE.test(v.trim());
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
