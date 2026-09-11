import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("infra base", () => {
  it("GET /api/v1/health → 200 ok", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("rota inexistente → 404 com shape de erro padrão", async () => {
    const res = await request(app).get("/api/v1/nao-existe");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: "NOT_FOUND", message: "Rota não encontrada" },
    });
  });
});
