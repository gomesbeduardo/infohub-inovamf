import { NextResponse } from 'next/server';
import { checarBanco } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Healthcheck para o Coolify: estado do app + conexão/schema do banco. */
export async function GET() {
  const banco = await checarBanco();
  const saudavel = banco.estado !== 'erro';

  return NextResponse.json(
    { estado: saudavel ? 'ok' : 'degradado', banco, versao: process.env.npm_package_version ?? null },
    { status: saudavel ? 200 : 503 },
  );
}
