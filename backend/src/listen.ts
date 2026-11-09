import type { Express } from "express";
import type { Server } from "node:http";

/** Sobe o app só no loopback: o projeto roda localmente e não deve aceitar conexões da rede. */
export function escutar(app: Express, porta: number): Promise<Server> {
  return new Promise((ok) => {
    const servidor = app.listen(porta, "127.0.0.1", () => ok(servidor));
  });
}
