import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { routes } from "./routes.js";
import { errorHandler } from "./middlewares/error.js";

// Monta o Express: cors, json, rotas em /api/v1, 404 e error handler central.
// Exportado como factory para os testes subirem o app sem abrir porta.
export function createApp() {
  const app = express();

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
