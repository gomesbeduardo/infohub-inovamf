import { Pool } from 'pg';

/**
 * Configuração do banco vinda do ambiente.
 *
 * Nesta fase o app ainda roda com os dados mockados em memória (`src/data/`);
 * o banco existe só para ser apontado/validado (healthcheck) e receber o schema
 * de `docs/sql/infohub_schema.sql` aplicado manualmente.
 */
export type DbConfig = {
  connectionString: string;
  /** Schema alvo dentro do banco (`search_path`). */
  schema: string;
  ssl: boolean;
};

export function lerConfigDb(env: NodeJS.ProcessEnv = process.env): DbConfig | null {
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) return null;
  return {
    connectionString,
    schema: env.DB_SCHEMA?.trim() || 'public',
    ssl: env.DATABASE_SSL === 'true',
  };
}

let pool: Pool | null = null;

/** Pool compartilhado; `null` quando `DATABASE_URL` não está definida. */
export function getPool(): Pool | null {
  if (pool) return pool;
  const config = lerConfigDb();
  if (!config) return null;
  pool = new Pool({
    connectionString: config.connectionString,
    // Fixa o schema alvo em toda conexão do pool.
    options: `-c search_path=${config.schema}`,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    connectionTimeoutMillis: 5_000,
  });
  return pool;
}

export type DbStatus =
  | { estado: 'nao-configurado' }
  | { estado: 'ok'; schema: string; schemaExiste: boolean; tabelas: number }
  | { estado: 'erro'; schema: string; erro: string };

/** Testa a conexão e confere se o schema configurado existe. */
export async function checarBanco(): Promise<DbStatus> {
  const config = lerConfigDb();
  if (!config) return { estado: 'nao-configurado' };

  const p = getPool();
  if (!p) return { estado: 'nao-configurado' };

  try {
    const { rows } = await p.query<{ tabelas: string }>(
      `SELECT count(*)::text AS tabelas
         FROM information_schema.tables
        WHERE table_schema = $1`,
      [config.schema],
    );
    const tabelas = Number(rows[0]?.tabelas ?? 0);
    const { rowCount } = await p.query(
      'SELECT 1 FROM information_schema.schemata WHERE schema_name = $1',
      [config.schema],
    );
    return {
      estado: 'ok',
      schema: config.schema,
      schemaExiste: (rowCount ?? 0) > 0,
      tabelas,
    };
  } catch (e) {
    return {
      estado: 'erro',
      schema: config.schema,
      erro: e instanceof Error ? e.message : String(e),
    };
  }
}
