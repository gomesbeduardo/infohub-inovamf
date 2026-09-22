// Único lugar que lê process.env. Ninguém mais toca em process.env direto.
import { existsSync } from "node:fs";

// Em dev/test carrega o .env local; em produção as variáveis vêm do ambiente.
try {
  if (existsSync(".env")) process.loadEnvFile(".env");
} catch {
  // sem .env — segue com o que estiver no ambiente
}

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor || valor.trim() === "") {
    throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  }
  return valor;
}

export const env = {
  databaseUrl: obrigatoria("DATABASE_URL"),
  port: Number(process.env.PORT ?? 3333),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  jwtSecret: obrigatoria("JWT_SECRET"),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  refreshTtlDays: Number(process.env.REFRESH_TTL_DAYS ?? 30),
  // Convite de conta: base do link enviado por e-mail e validade do token.
  inviteUrlBase:
    process.env.INVITE_URL_BASE ??
    `${process.env.CORS_ORIGIN ?? "http://localhost:3000"}/convite`,
  inviteTtlHoras: Number(process.env.INVITE_TTL_HORAS ?? 72),
  // G1: monta o cenário de demonstração no boot (contas @demo.infohub.dev).
  seedDemo: process.env.SEED_DEMO === "true",
} as const;
