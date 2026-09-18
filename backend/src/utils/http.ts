import type { Request } from "express";

// Paginação padrão (§9): ?page=1&perPage=20, perPage entre 1 e 100.
export function paginacao(req: Request): {
  page: number;
  perPage: number;
  skip: number;
} {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage ?? 20) || 20));
  return { page, perPage, skip: (page - 1) * perPage };
}
