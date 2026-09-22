import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { linkConvite } from "../utils/convite.js";
import { seedBase } from "./base.js";
import { seedDemo } from "./demo.js";

// Roda no `npm start`, entre `prisma migrate deploy` e o servidor.
// Falha de seed NÃO derruba o boot (loga e segue): um deploy não pode tirar o
// sistema do ar por causa de dado de demonstração (Problema 1). Pelo mesmo
// motivo o seed também não pode TRAVAR o boot: se passar de 60s (ex.: banco
// lento ou indisponível), a aplicação sobe assim mesmo — main() corre contra
// um timeout e, se perder, a gente segue em frente e desconecta.
async function main() {
  await seedBase(prisma);
  console.log("[seed] base ok");
  if (!env.seedDemo) return;
  const r = await seedDemo(prisma);
  console.log(
    r.criado
      ? `[seed] demo criado — link de convite pendente (Letícia): ${linkConvite(r.convitePendente)}`
      : "[seed] demo já existe — nada a fazer",
  );
}

const TIMEOUT_MS = 60_000;

function tempoEsgotado(ms: number): Promise<"tempo-esgotado"> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("tempo-esgotado"), ms);
    timer.unref(); // nunca segura o processo vivo só por causa do timeout
  });
}

Promise.race([main().then(() => "ok" as const), tempoEsgotado(TIMEOUT_MS)])
  .then((resultado) => {
    if (resultado === "tempo-esgotado") {
      console.log("[seed] tempo esgotado — a aplicação sobe mesmo assim");
    }
  })
  .catch((e) => console.error("[seed] falhou — a aplicação sobe mesmo assim", e))
  .finally(() => prisma.$disconnect().catch(() => undefined));
