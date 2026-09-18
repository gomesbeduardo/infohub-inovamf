import { randomUUID } from "node:crypto";

// Estratégia de slug (decisão do projeto): NUNCA expor UUID cru na API.
// O slug é um base64url dos 16 bytes do UUID da linha — gerado pelo nosso
// sistema, opaco e REVERSÍVEL. Assim toda entidade tem slug, mesmo as tabelas
// sem coluna `slug` (decodifica-se o slug de volta ao UUID e busca-se pela PK).
// Como é bijeção do UUID, a unicidade do slug decorre da PK — sem risco de
// colisão e sem necessidade de retry (o §8 do plano falava de cuid2; não se
// aplica aqui).

const HEX32 = /^[0-9a-f]{32}$/i;
const SLUG22 = /^[A-Za-z0-9_-]{22}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Valida formato de UUID antes de usá-lo num where do Prisma — assim um id
// malformado vira 400 no controller, não P2023/500 do Postgres.
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

export function newId(): string {
  return randomUUID();
}

// UUID (com hífens) → slug base64url de 22 chars.
export function toSlug(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  if (!HEX32.test(hex)) {
    throw new Error(`UUID inválido para slug: ${uuid}`);
  }
  return Buffer.from(hex, "hex").toString("base64url");
}

// slug → UUID (com hífens). Retorna null se malformado — o controller
// traduz null em 404 (recurso não encontrado), nunca 500.
export function fromSlug(slug: string): string | null {
  if (typeof slug !== "string" || !SLUG22.test(slug)) return null;
  const buf = Buffer.from(slug, "base64url");
  if (buf.length !== 16) return null;
  const hex = buf.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Par pronto para inserir em tabelas que têm coluna `slug` (usuarios, equipes):
// gera o id no app e o slug derivado, mantendo a coluna NOT NULL/UNIQUE coerente.
export function novoIdComSlug(): { id: string; slug: string } {
  const id = newId();
  return { id, slug: toSlug(id) };
}
