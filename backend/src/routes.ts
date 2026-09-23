import { Router } from "express";
import { auth } from "./middlewares/auth.js";
import { role } from "./middlewares/role.js";
import { authLimiter } from "./middlewares/rateLimit.js";
import * as authCtrl from "./controllers/auth.controller.js";
import * as usuarioCtrl from "./controllers/usuario.controller.js";
import * as equipeCtrl from "./controllers/equipe.controller.js";
import * as tarefaCtrl from "./controllers/tarefa.controller.js";
import * as modeloCtrl from "./controllers/modelo.controller.js";
import * as entregaCtrl from "./controllers/entrega.controller.js";
import * as conviteCtrl from "./controllers/convite.controller.js";
import * as notificacaoCtrl from "./controllers/notificacao.controller.js";
import * as referenciaCtrl from "./controllers/referencia.controller.js";
import * as anotacaoCtrl from "./controllers/anotacao.controller.js";
import * as dashboardCtrl from "./controllers/dashboard.controller.js";
import * as publicoCtrl from "./controllers/publico.controller.js";

// Router único, montado em /api/v1 pelo app.ts.
// Recursos entram aqui na ordem do §10: auth → usuarios → equipes → ...
// Quando passar de ~150 linhas, quebrar em routes/<recurso>.routes.ts.
export const routes = Router();

routes.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Auth (§7) ---------------------------------------------------------------
routes.post("/auth/login", authLimiter, authCtrl.login);
routes.post("/auth/register", authLimiter, authCtrl.register);
routes.get("/auth/invite", authCtrl.invitePreview);
routes.post("/auth/refresh", authCtrl.refresh);
routes.post("/auth/logout", auth, authCtrl.logout);
routes.get("/auth/me", auth, authCtrl.me);
routes.patch("/auth/me", auth, authCtrl.atualizarMe);
routes.post("/auth/senha", auth, authLimiter, authCtrl.trocarSenha);
routes.post("/auth/redefinir-senha", authLimiter, authCtrl.redefinirSenha);

// --- Usuários (RF-03: admin cria/edita/desativa; convite por e-mail) ----------
routes.get("/usuarios", auth, role("admin"), usuarioCtrl.index);
routes.post("/usuarios", auth, role("admin"), usuarioCtrl.store);
routes.get("/usuarios/:slug", auth, role("admin"), usuarioCtrl.show);
routes.patch("/usuarios/:slug", auth, role("admin"), usuarioCtrl.update);
routes.post("/usuarios/:slug/redefinir-senha", auth, role("admin"), usuarioCtrl.gerarRedefinicaoSenha);

// --- Convites (RF-03) ---------------------------------------------------------
routes.get("/convites/pendentes", auth, role("admin"), conviteCtrl.pendentes);
routes.post("/usuarios/:slug/convite", auth, role("admin"), conviteCtrl.reenviar);

// --- Referência (leitura) -----------------------------------------------------
routes.get("/areas-ideia", referenciaCtrl.areas);
routes.get("/etapas-funil", referenciaCtrl.etapas);
routes.get("/ciclos", referenciaCtrl.ciclos);

// --- Números públicos da landing (issue #157) ----------------------------------
routes.get("/publico/numeros", publicoCtrl.numeros);

// --- Equipes (RF-02/05/06/08/09) ----------------------------------------------
// Inscrição do aluno é pública (formulário de ideia).
routes.post("/equipes/inscricao", authLimiter, equipeCtrl.inscricao);
routes.get("/equipes", auth, equipeCtrl.index);
routes.get("/equipes/export.csv", auth, role("admin", "mentor"), equipeCtrl.exportarCSV);
routes.get("/equipes/:slug", auth, equipeCtrl.show);
routes.get("/equipes/:slug/linha-do-tempo", auth, equipeCtrl.linhaDoTempo);
routes.post("/equipes", auth, role("admin"), equipeCtrl.store);
routes.patch("/equipes/:slug", auth, role("admin"), equipeCtrl.update);
routes.post("/equipes/:slug/etapa", auth, role("admin", "mentor"), equipeCtrl.moverEtapa);
routes.post("/equipes/:slug/membros", auth, equipeCtrl.adicionarMembro);
routes.post("/equipes/:slug/membros/:membro/convite", auth, equipeCtrl.gerarConviteMembro);

// --- Anotações internas (RF-10) — nunca chegam ao aluno -----------------------
routes.get("/equipes/:slug/anotacoes", auth, role("admin", "mentor"), anotacaoCtrl.index);
routes.post("/equipes/:slug/anotacoes", auth, role("admin", "mentor"), anotacaoCtrl.store);

// --- Tarefas (RF-11/12/13/15) -------------------------------------------------
routes.get("/modelos-tarefa", auth, role("admin", "mentor"), modeloCtrl.index);
routes.get("/equipes/:slug/tarefas", auth, tarefaCtrl.index);
routes.post("/equipes/:slug/tarefas", auth, role("admin", "mentor"), tarefaCtrl.store);
routes.get("/tarefas/:slug", auth, tarefaCtrl.show);
routes.patch("/tarefas/:slug", auth, role("admin", "mentor"), tarefaCtrl.update);
routes.post("/tarefas/:slug/iniciar", auth, role("aluno"), tarefaCtrl.iniciar);

// --- Entregas / avaliações (RF-14/15/16) — aluno membro envia; admin/mentor avalia
routes.get("/tarefas/:slug/entregas", auth, entregaCtrl.index);
routes.post("/tarefas/:slug/entregas", auth, entregaCtrl.store);
routes.get("/entregas/:slug", auth, entregaCtrl.show);
routes.post("/entregas/:slug/avaliacoes", auth, role("admin", "mentor"), entregaCtrl.avaliar);

// --- Notificações (RF-18/20/21) -----------------------------------------------
routes.get("/notificacoes", auth, notificacaoCtrl.index);
routes.get("/notificacoes/preferencias", auth, notificacaoCtrl.preferencias);
routes.patch("/notificacoes/preferencias", auth, notificacaoCtrl.definirPreferencia);
routes.post("/equipes/:slug/lembrete", auth, role("admin", "mentor"), notificacaoCtrl.lembrete);

// --- Dashboard (RF-22) ---------------------------------------------------------
routes.get("/dashboard", auth, role("admin", "mentor"), dashboardCtrl.show);
routes.get("/dashboard/agenda", auth, role("admin", "mentor"), dashboardCtrl.agenda);
