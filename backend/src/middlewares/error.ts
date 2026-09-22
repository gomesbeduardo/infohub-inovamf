import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ehHttpError } from "../utils/error.js";

// Handler central. Shape de erro SEMPRE: { error: { code, message } }.
// eslint-disable-next-line @typescript-eslint/no-unused-vars — Express exige 4 args
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1) erro de domínio com status próprio
  if (ehHttpError(err)) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  // 2) erros conhecidos do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        error: { code: "CONFLICT", message: "Registro já existe" },
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Registro não encontrado" },
      });
      return;
    }
    if (err.code === "P2003") {
      res.status(409).json({
        error: { code: "FK_CONFLICT", message: "Violação de referência" },
      });
      return;
    }
  }

  // 3) resto → 500, loga stack, mensagem genérica (nunca vaza detalhe interno)
  console.error("[erro nao tratado]", err);
  res.status(500).json({
    error: { code: "INTERNAL", message: "Erro interno" },
  });
}
