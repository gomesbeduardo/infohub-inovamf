import { prisma } from "../prisma.js";
import { purgeDemo } from "./purge-demo.js";

// `npm run seed:demo:purge` — remove a camada de demonstração do G1.
purgeDemo(prisma)
  .then((r) => console.log(`[purge] removidas ${r.equipes} equipes e ${r.usuarios} contas demo`))
  .catch((e) => {
    console.error("[purge] falhou — nada foi apagado", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
