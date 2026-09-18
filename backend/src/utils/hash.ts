import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const BCRYPT_ROUNDS = 12;

// --- Senha do usuário (coluna usuarios.senha) ---------------------------------
// bcrypt (decisão do projeto): coerente com a NOTE do schema, que já usa bcrypt
// para os tokens de convite/recuperação. Nunca loga, nunca retorna.
export function hashSenha(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verificarSenha(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Hash "isca": comparado quando o e-mail não existe, para o login gastar o
// mesmo tempo de um usuário real e não vazar existência por timing.
export const DUMMY_SENHA_HASH = bcrypt.hashSync(
  "usuario-inexistente-dummy",
  BCRYPT_ROUNDS,
);

// --- Tokens de convite / recuperação (tokens_senha.token_hash) ----------------
// bcrypt com salt aleatório por hash ⇒ NÃO se busca a linha pelo hash.
// O token bruto entregue ao usuário carrega o `id` da linha; a validação faz
// SELECT por id + compare(bruto, token_hash). (Ver ENTITIES.md §7.)
export function hashTokenSenha(raw: string): Promise<string> {
  return bcrypt.hash(raw, BCRYPT_ROUNDS);
}

export function compararTokenSenha(
  raw: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}

// --- Tokens de acesso / refresh (tokens_acesso.token_hash CHAR(64)) -----------
// SHA-256 determinístico: permite lookup direto pelo índice único a cada
// requisição. O token bruto tem 256 bits de entropia e nunca é persistido.
export function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex"); // 64 chars hex
}

export function tokenAleatorio(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
