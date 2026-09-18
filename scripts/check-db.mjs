#!/usr/bin/env node
/**
 * Healthcheck de boot: confere a conexão e o schema configurados antes do app subir.
 *
 * Nunca derruba o processo — o app ainda roda com os dados mockados em memória.
 * Para falhar o boot quando o banco não responder, use DATABASE_REQUIRED=true.
 */
import pg from 'pg';

const connectionString = process.env.DATABASE_URL?.trim();
const schema = process.env.DB_SCHEMA?.trim() || 'public';
const obrigatorio = process.env.DATABASE_REQUIRED === 'true';

if (!connectionString) {
  const msg = 'DATABASE_URL não definida — subindo com os dados mockados em memória.';
  if (obrigatorio) {
    console.error(`[db] ${msg} (DATABASE_REQUIRED=true)`);
    process.exit(1);
  }
  console.warn(`[db] ${msg}`);
  process.exit(0);
}

const client = new pg.Client({
  connectionString,
  options: `-c search_path=${schema}`,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 5000,
});

try {
  await client.connect();
  const { rows } = await client.query(
    `SELECT (SELECT count(*) FROM information_schema.schemata WHERE schema_name = $1) AS schema_existe,
            (SELECT count(*) FROM information_schema.tables   WHERE table_schema = $1) AS tabelas`,
    [schema],
  );
  const { schema_existe, tabelas } = rows[0];

  if (Number(schema_existe) === 0) {
    console.warn(
      `[db] conectado, mas o schema "${schema}" não existe. ` +
        `Crie-o e aplique docs/sql/infohub_schema.sql (veja o README).`,
    );
  } else {
    console.log(`[db] ok — schema "${schema}" com ${tabelas} tabela(s).`);
  }
} catch (e) {
  console.error(`[db] falha ao conectar (schema "${schema}"): ${e.message}`);
  if (obrigatorio) process.exit(1);
} finally {
  await client.end().catch(() => {});
}
