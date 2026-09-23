import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { routes } from "./routes.js";
import { errorHandler } from "./middlewares/error.js";

// Monta o Express: cors, json, rotas em /api/v1, 404 e error handler central.
// Exportado como factory para os testes subirem o app sem abrir porta.
export function createApp() {
  const app = express();

  // Em produção o Express só é alcançado pelo rewrite do Next (127.0.0.1), que
  // repassa o IP do cliente em X-Forwarded-For. Confiar só no loopback faz
  // req.ip ser o IP real (rate limit por cliente) sem aceitar XFF de fora.
  app.set("trust proxy", "loopback");

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.use("/api/v1", routes);

  // 404 padronizado (mesmo shape de erro do handler central)
  app.use((_req, res) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Rota não encontrada" },
    });
  });

  app.use(errorHandler);

  return app;
}
