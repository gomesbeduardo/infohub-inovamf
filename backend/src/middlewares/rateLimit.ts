import rateLimit from "express-rate-limit";

// §7: 5 tentativas / 15 min por IP + e-mail em /auth/login e /auth/register.
// Desligado em teste para não deixar a suíte flaky.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  validate: false, // não usamos req.ip cru como chave sozinho; combinamos com e-mail
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.toLowerCase()
        : "sem-email";
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
