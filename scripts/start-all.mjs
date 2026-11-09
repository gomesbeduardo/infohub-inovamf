// Sobe backend e frontend (já buildados) com um comando só, para uso local:
// `npm run build` e depois `npm start`.
//
// Express na porta 3333 (interna) e Next em $PORT (padrão 3000). O Next
// repassa /api/* para o Express, então o browser só fala com a porta 3000.
//
// Regra de vida do processo: se qualquer um dos dois morrer, derrubamos o outro
// e saímos com código de erro, em vez de manter metade da aplicação no ar.
import { spawn } from "node:child_process";

// Fixa: o rewrite do Next que aponta para cá é gravado no build, então essa
// porta não pode variar por ambiente. Se mudar, mude em frontend/next.config.mjs.
const PORTA_API = "3333";
const PORTA_WEB = process.env.PORT ?? "3000";

const filhos = [];
let encerrando = false;

function subir(nome, dir, env) {
  // shell: true — no Windows o `npm` é um .cmd e não é executável direto.
  const filho = spawn("npm", ["start"], {
    cwd: dir,
    env: { ...process.env, ...env },
    stdio: ["ignore", "inherit", "inherit"],
    shell: true,
  });

  filho.on("exit", (codigo, sinal) => {
    if (encerrando) return;
    console.error(`[start-all] ${nome} saiu (código ${codigo}, sinal ${sinal})`);
    derrubarTudo(codigo ?? 1);
  });

  filhos.push({ nome, filho });
  return filho;
}

function derrubarTudo(codigo) {
  if (encerrando) return;
  encerrando = true;
  // Se o outro filho sair antes do timer (que é unref), o Node termina sozinho
  // com este código — senão sairia 0 depois de um crash.
  process.exitCode = codigo;
  for (const { filho } of filhos) {
    if (filho.exitCode === null) filho.kill("SIGTERM");
  }
  // Dá um tempo para o shutdown gracioso antes de sair de vez.
  setTimeout(() => process.exit(codigo), 5000).unref();
}

for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, () => derrubarTudo(0));
}

// O backend roda `prisma migrate deploy` no seu próprio `npm start`, então as
// migrations pendentes são aplicadas aqui, antes de a API atender.
subir("backend", "backend", { PORT: PORTA_API });
subir("frontend", "frontend", { PORT: PORTA_WEB });

console.log(
  `[start-all] backend em 127.0.0.1:${PORTA_API} · frontend em 0.0.0.0:${PORTA_WEB}`,
);
