import type { Prisma, PrismaClient } from "@prisma/client";
import { hashSenha, hashTokenSenha, tokenAleatorio } from "../utils/hash.js";
import { newId, novoIdComSlug } from "../utils/slug.js";
import { hojeISO } from "../domain/atraso.js";
import { CICLO_ATUAL, MODELOS_TAREFA } from "./base.js";

// Camada DEMO do seed — cenário obrigatório do G1, armado para cada fluxo da
// demo ao vivo. Tudo que é demo usa o domínio DEMO_DOMINIO: é o marcador que o
// purge usa para remover a camada quando o sistema entrar em uso real.
// Roda UMA vez (se mentor1 já existe, não faz nada): o que acontecer na demo
// persiste entre deploys.
//
// Prazos folgados de propósito: a demo pode rodar dias depois do deploy sem
// nenhuma tarefa "virar" atrasada por conta própria. A ÚNICA tarefa atrasada
// do cenário é a obrigatória da Etapa 2 da equipe B — prazo fixo no passado.

export const DEMO_DOMINIO = "@demo.infohub.dev";
export const SENHAS_DEMO = { mentor: "mentor123", aluno: "aluno123" } as const;

type Pessoa = {
  nome: string;
  usuario: string; // parte local do e-mail
  curso?: string;
  semestre?: string;
  matricula?: string;
  pendente?: boolean; // ainda não aceitou o convite
};

const MENTORES: Pessoa[] = [
  { nome: "Carla Menezes", usuario: "mentor1" },
  { nome: "Rafael Dornelles", usuario: "mentor2" },
  { nome: "Juliana Prates", usuario: "mentor3" },
  { nome: "Marcos Tavares", usuario: "mentor4" },
];

type EquipeDemo = {
  chave: "A" | "B" | "C";
  nome: string;
  descricao: string;
  area: string;
  estagio: string;
  mentor: 0 | 1;
  etapa: 1 | 2;
  lider: Pessoa;
  integrantes: Pessoa[];
};

// Cursos e semestres seguem a lista fechada da AMF (frontend/src/domain/cursos.ts
// CURSOS_AMF) e semestres em dígito puro ('1'..'10', frontend/src/domain/semestres.ts
// SEMESTRES) — o mesmo domínio fechado que o formulário de cadastro usa, para a
// demo nunca exibir um valor que o cadastro real não aceitaria.
const EQUIPES: EquipeDemo[] = [
  {
    chave: "A",
    nome: "EcoRota",
    descricao: "Aplicativo que otimiza rotas de coleta seletiva para cooperativas de reciclagem de Canoas.",
    area: "Sustentabilidade",
    estagio: "prototipo",
    mentor: 0,
    etapa: 2,
    lider: { nome: "Bruna Lopes", usuario: "bruna.lopes", curso: "Sistemas de Informação", semestre: "5", matricula: "20230101" },
    integrantes: [
      { nome: "Diego Ramos", usuario: "diego.ramos", curso: "Sistemas de Informação", semestre: "5", matricula: "20230102" },
      { nome: "Larissa Kunz", usuario: "larissa.kunz", curso: "Administração", semestre: "4", matricula: "20230215" },
      { nome: "Rafaela Bortolini", usuario: "rafaela.bortolini", curso: "Administração", semestre: "5", matricula: "20230216" },
    ],
  },
  {
    chave: "B",
    nome: "SaúdeJá",
    descricao: "Triagem por WhatsApp que orienta o paciente para a unidade de saúde certa antes de sair de casa.",
    area: "Saúde",
    estagio: "ideia",
    mentor: 0,
    etapa: 2,
    lider: { nome: "Pedro Henrique Souza", usuario: "pedro.souza", curso: "Ciências Contábeis", semestre: "6", matricula: "20220330" },
    integrantes: [
      { nome: "Camila Fontana", usuario: "camila.fontana", curso: "Ciências Contábeis", semestre: "6", matricula: "20220331" },
      { nome: "Thiago Weber", usuario: "thiago.weber", curso: "Sistemas de Informação", semestre: "3", matricula: "20240112" },
      { nome: "Lucas Andrade", usuario: "lucas.andrade", curso: "Direito", semestre: "4", matricula: "20230445" },
    ],
  },
  {
    chave: "C",
    nome: "Aprende+",
    descricao: "Plataforma de monitoria entre alunos veteranos e calouros, com agendamento e trilhas por disciplina.",
    area: "Educação",
    estagio: "ideia",
    mentor: 1,
    etapa: 1,
    lider: { nome: "Mariana Alves", usuario: "mariana.alves", curso: "Pedagogia", semestre: "2", matricula: "20250404" },
    integrantes: [
      { nome: "Gustavo Pires", usuario: "gustavo.pires", curso: "Sistemas de Informação", semestre: "2", matricula: "20250405" },
      { nome: "Beatriz Nunes", usuario: "beatriz.nunes", curso: "Pedagogia", semestre: "2", matricula: "20250406" },
      { nome: "Yasmin Costa", usuario: "yasmin.costa", curso: "Hotelaria", semestre: "3", matricula: "20250407" },
      { nome: "Letícia Moraes", usuario: "leticia.moraes", pendente: true },
    ],
  },
];

const email = (p: Pessoa) => `${p.usuario}${DEMO_DOMINIO}`;

function diaRelativo(hoje: string, n: number): Date {
  const d = new Date(`${hoje}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000);

export async function seedDemo(
  db: PrismaClient,
  hoje: string = hojeISO(),
): Promise<{ criado: false } | { criado: true; convitePendente: string }> {
  const marcador = await db.usuarios.findUnique({
    where: { email: email(MENTORES[0]!) },
    select: { id: true },
  });
  if (marcador) return { criado: false };

  // bcrypt é caro: um hash por papel (contas demo compartilham a senha do papel).
  const [hashMentor, hashAluno, hashInutil] = await Promise.all([
    hashSenha(SENHAS_DEMO.mentor),
    hashSenha(SENHAS_DEMO.aluno),
    hashSenha(tokenAleatorio(32)),
  ]);
  const conviteId = newId();
  const segredo = tokenAleatorio(24);
  const conviteHash = await hashTokenSenha(segredo);

  const ciclo = await db.ciclos.findUnique({ where: { nome: CICLO_ATUAL.nome }, select: { id: true } });
  const areas = await db.areas_ideia.findMany({ select: { id: true, nome: true } });
  const modelos = await db.modelos_tarefa.findMany({ select: { id: true, etapa_id: true, titulo: true } });
  const modeloId = (etapa: number, titulo: string) =>
    modelos.find((m) => m.etapa_id === etapa && m.titulo === titulo)?.id ?? null;
  const T = (etapa: number) => MODELOS_TAREFA.find((m) => m.etapa === etapa)!;

  await db.$transaction(
    async (tx) => {
      const agora = new Date();

      const criarPessoa = async (p: Pessoa, tipo: "mentor" | "aluno") => {
        const ids = novoIdComSlug();
        await tx.usuarios.create({
          data: {
            id: ids.id,
            slug: ids.slug,
            nome: p.nome,
            email: email(p),
            senha: p.pendente ? hashInutil : tipo === "mentor" ? hashMentor : hashAluno,
            telefone: "51999990000",
            tipo_usuario: tipo,
            convite_aceito_em: p.pendente ? null : agora,
            email_verificado_em: p.pendente ? null : agora,
          },
        });
        if (tipo === "aluno" && !p.pendente) {
          await tx.alunos.create({
            data: { usuario_id: ids.id, curso: p.curso, semestre: p.semestre, matricula: p.matricula },
          });
        }
        return ids.id;
      };

      const criarTarefa = async (t: {
        equipeId: string;
        etapa: number;
        titulo: string;
        descricao: string;
        obrigatoria: boolean;
        prazo: Date;
        status: string;
        criadoPor: string;
        criadoEm: Date;
        concluidaEm?: Date;
      }) =>
        (
          await tx.tarefas.create({
            data: {
              equipe_id: t.equipeId,
              etapa_id: t.etapa,
              modelo_id: modeloId(t.etapa, t.titulo),
              titulo: t.titulo,
              descricao: t.descricao,
              obrigatoria: t.obrigatoria,
              data_entrega: t.prazo,
              status: t.status,
              criado_por: t.criadoPor,
              criado_em: t.criadoEm,
              concluida_em: t.concluidaEm ?? null,
            },
            select: { id: true },
          })
        ).id;

      const criarEntrega = async (e: {
        tarefaId: string;
        enviadoPor: string;
        url: string;
        nome: string;
        comentario: string;
        em: Date;
      }) =>
        (
          await tx.entregas.create({
            data: {
              tarefa_id: e.tarefaId,
              versao: 1,
              enviado_por: e.enviadoPor,
              comentario: e.comentario,
              criado_em: e.em,
              arquivos_entrega: {
                create: [{ tipo: "link", url_externa: e.url, nome_original: e.nome }],
              },
            },
            select: { id: true },
          })
        ).id;

      const mentorIds: string[] = [];
      for (const m of MENTORES) mentorIds.push(await criarPessoa(m, "mentor"));

      for (const e of EQUIPES) {
        const mentorId = mentorIds[e.mentor]!;
        const equipe = novoIdComSlug();
        // Linha do tempo coerente: a equipe nasceu há 12 dias e todo mundo que
        // já estava nela (líder + integrantes) entrou nesse instante.
        const criadoEmEquipe = horasAtras(24 * 12);
        await tx.equipes.create({
          data: {
            id: equipe.id,
            slug: equipe.slug,
            nome_ideia: e.nome,
            descricao_ideia: e.descricao,
            estagio_ideia: e.estagio,
            area_id: areas.find((a) => a.nome === e.area)?.id ?? null,
            ciclo_id: ciclo?.id ?? null,
            mentor_id: mentorId,
            etapa_atual_id: e.etapa,
            origem_divulgacao: "Divulgação em sala",
            criado_em: criadoEmEquipe,
          } satisfies Prisma.equipesUncheckedCreateInput,
        });

        const liderId = await criarPessoa(e.lider, "aluno");
        await tx.equipe_membros.create({
          data: { equipe_id: equipe.id, usuario_id: liderId, papel: "lider", entrou_em: criadoEmEquipe },
        });
        for (const p of e.integrantes) {
          const id = await criarPessoa(p, "aluno");
          await tx.equipe_membros.create({
            data: { equipe_id: equipe.id, usuario_id: id, papel: "integrante", entrou_em: criadoEmEquipe },
          });
          if (p.pendente) {
            await tx.tokens_senha.create({
              data: {
                id: conviteId,
                usuario_id: id,
                token_hash: conviteHash,
                finalidade: "convite",
                expira_em: diaRelativo(hoje, 30),
              },
            });
          }
        }

        // Etapa 1 — igual para todos; A e B já aprovaram e avançaram. Tarefa
        // criada ~11 dias atrás, prazo em -9 (a entrega, 10 dias atrás, ficou
        // dentro do prazo) e aprovação ~180h atrás (antes do avanço, 7 dias atrás).
        const e1 = T(1);
        if (e.etapa === 2) {
          const t1 = await criarTarefa({
            equipeId: equipe.id, etapa: 1, titulo: e1.titulo, descricao: e1.descricao,
            obrigatoria: true, prazo: diaRelativo(hoje, -9), status: "aprovada",
            criadoPor: mentorId, criadoEm: horasAtras(24 * 11), concluidaEm: horasAtras(180),
          });
          const en1 = await criarEntrega({
            tarefaId: t1, enviadoPor: liderId,
            url: `https://docs.google.com/document/d/demo-${e.chave.toLowerCase()}-ideia`,
            nome: "Ideia revisada", comentario: "Dados conferidos pela equipe.", em: horasAtras(24 * 10),
          });
          await tx.avaliacoes_entrega.create({
            data: {
              entrega_id: en1, avaliador_id: mentorId, resultado: "aprovada",
              comentario: "Ideia clara, podem seguir.", criado_em: horasAtras(180),
            },
          });
          await tx.historico_etapas.create({
            data: {
              equipe_id: equipe.id, etapa_origem_id: 1, etapa_destino_id: 2,
              status_origem: "ativa", status_destino: "ativa",
              movido_por: mentorId, forcado: false, observacao: "Etapa 1 aprovada",
              criado_em: horasAtras(24 * 7),
            },
          });
        } else {
          await criarTarefa({
            equipeId: equipe.id, etapa: 1, titulo: e1.titulo, descricao: e1.descricao,
            obrigatoria: true, prazo: diaRelativo(hoje, 30), status: "pendente", criadoPor: mentorId,
            criadoEm: horasAtras(24 * 11),
          });
        }

        // Etapa 2 — tarefas criadas ~7 dias atrás (logo após a aprovação da
        // Etapa 1). Só a obrigatória da equipe B fica com prazo no passado:
        // é a única tarefa atrasada do cenário.
        const e2 = T(2);
        if (e.chave === "A") {
          const t2 = await criarTarefa({
            equipeId: equipe.id, etapa: 2, titulo: e2.titulo, descricao: e2.descricao,
            obrigatoria: true, prazo: diaRelativo(hoje, 30), status: "entregue", criadoPor: mentorId,
            criadoEm: horasAtras(24 * 7),
          });
          await criarEntrega({
            tarefaId: t2, enviadoPor: liderId,
            url: "https://calendar.google.com/calendar/demo-ecorota-encontro-1",
            nome: "Convite do encontro", comentario: "Encontro marcado para quinta, 19h, sala 204.",
            em: horasAtras(20),
          });
          await criarTarefa({
            equipeId: equipe.id, etapa: 2, titulo: "Gravar apresentação de 1 minuto",
            descricao: "Opcional: vídeo curto para o mentor conhecer a equipe.",
            obrigatoria: false, prazo: diaRelativo(hoje, 45), status: "pendente", criadoPor: mentorId,
            criadoEm: horasAtras(24 * 7),
          });
        }
        if (e.chave === "B") {
          await criarTarefa({
            equipeId: equipe.id, etapa: 2, titulo: e2.titulo, descricao: e2.descricao,
            obrigatoria: true, prazo: diaRelativo(hoje, -3), status: "pendente", criadoPor: mentorId,
            criadoEm: horasAtras(24 * 7),
          });
        }
      }
    },
    { timeout: 30_000 },
  );

  return { criado: true, convitePendente: `${conviteId}.${segredo}` };
}
