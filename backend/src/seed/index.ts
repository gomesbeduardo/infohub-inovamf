import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { linkConvite } from "../utils/convite.js";
import { seedBase } from "./base.js";
import { seedDemo } from "./demo.js";

// Roda no `npm start`, entre `prisma migrate deploy` e o servidor.
// Falha de seed NÃO derruba o boot (loga e segue): um deploy não pode tirar o
// sistema do ar por causa de dado de demonstração (Problema 1).
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

main()
  .catch((e) => console.error("[seed] falhou — a aplicação sobe mesmo assim", e))
  .finally(() => prisma.$disconnect());
