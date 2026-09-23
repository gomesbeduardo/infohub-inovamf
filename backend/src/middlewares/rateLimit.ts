import rateLimit from "express-rate-limit";

// §7: 5 tentativas falhas / 15 min por IP + e-mail em /auth/login e /auth/register.
// req.ip é o IP real do cliente (app.ts confia no X-Forwarded-For do rewrite
// do Next); login certo não conta. Desligado em teste para não deixar a suíte flaky.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: false, // não usamos req.ip cru como chave sozinho; combinamos com e-mail
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: (req) => {
    // Inscrição manda o e-mail em lider.email; login/register em email.
    const bruto = req.body?.email ?? req.body?.lider?.email;
    const email = typeof bruto === "string" ? bruto.toLowerCase() : "sem-email";
    return `${req.ip ?? "sem-ip"}:${email}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Muitas tentativas. Tente novamente mais tarde.",
      },
    });
  },
});
