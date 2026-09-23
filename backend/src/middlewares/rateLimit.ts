import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";

// Chave dos limitadores públicos: IP real + e-mail do corpo. req.ip é o IP real
// do cliente (app.ts confia no X-Forwarded-For do rewrite do Next). A inscrição
// manda o e-mail em lider.email; as demais rotas em email.
function chaveIpEmail(req: Request): string {
  const bruto = req.body?.email ?? req.body?.lider?.email;
  const email = typeof bruto === "string" ? bruto.toLowerCase() : "sem-email";
  return `${req.ip ?? "sem-ip"}:${email}`;
}

function responder429(_req: Request, res: Response): void {
  res.status(429).json({
    error: {
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Tente novamente mais tarde.",
    },
  });
}

const COMUM = {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  validate: false, // não usamos req.ip cru como chave sozinho; combinamos com e-mail
  // Desligado em teste para não deixar a suíte flaky (rate-limit.test.ts religa).
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: chaveIpEmail,
  handler: responder429,
} as const;

// §7: 5 tentativas falhas / 15 min por IP + e-mail em /auth/login e
// /auth/register (e demais rotas públicas sensíveis). Login certo não conta.
export const authLimiter = rateLimit({ ...COMUM, skipSuccessfulRequests: true });

// Pedido de redefinição (adendo 23/09): a rota SEMPRE responde 202, então aqui
// TODA requisição conta — com skipSuccessfulRequests o limite nunca dispararia.
export const pedidoRedefinicaoLimiter = rateLimit({ ...COMUM, skipSuccessfulRequests: false });
