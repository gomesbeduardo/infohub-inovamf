import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { dataISO, hojeISO, STATUS_SEM_ENTREGA } from "../src/domain/atraso.js";
import { ADMIN_EMAIL, ADMIN_SENHA, CICLO_ATUAL, MODELOS_TAREFA, seedBase } from "../src/seed/base.js";
import { DEMO_DOMINIO, SENHAS_DEMO, seedDemo } from "../src/seed/demo.js";
import { purgeDemo } from "../src/seed/purge-demo.js";

// Lista fechada de cursos da AMF (frontend/src/domain/cursos.ts CURSOS_AMF) —
// duplicada aqui de propósito: o teste garante que o seed nunca usa um curso
// que o formulário de cadastro real não aceitaria, sem o backend depender do
// frontend.
const CURSOS_AMF = [
  "Administração",
  "Ciências Contábeis",
  "Direito",
  "Gastronomia",
  "Hotelaria",
  "Ontopsicologia",
  "Pedagogia",
  "Sistemas de Informação",
] as const;

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("seedBase", () => {
  it("cria ciclo, modelos e admin — e rodar de novo não duplica", async () => {
    await seedBase(prisma);
    await seedBase(prisma);

    expect(await prisma.ciclos.count({ where: { nome: CICLO_ATUAL.nome } })).toBe(1);
    for (const m of MODELOS_TAREFA) {
      expect(
        await prisma.modelos_tarefa.count({ where: { etapa_id: m.etapa, titulo: m.titulo } }),
      ).toBe(1);
    }
    expect(await prisma.usuarios.count({ where: { email: ADMIN_EMAIL, tipo_usuario: "admin" } })).toBe(1);
  });

  it("o admin inicial consegue logar", async () => {
    const r = await request(app).post("/api/v1/auth/login").send({ email: ADMIN_EMAIL, senha: ADMIN_SENHA });
    expect(r.status).toBe(200);
    expect(r.body.usuario.role).toBe("admin");
  });

  it("etapa 6 tem os entregáveis finais da RN-02", () => {
    expect(MODELOS_TAREFA.filter((m) => m.etapa === 6).map((m) => m.titulo)).toEqual([
      "Pitch vídeo",
      "Business Model Canvas final",
      "Value Proposition Design final",
    ]);
  });

  it("execuções simultâneas não duplicam modelos", async () => {
    await Promise.all([seedBase(prisma), seedBase(prisma), seedBase(prisma)]);
    for (const m of MODELOS_TAREFA) {
      expect(
        await prisma.modelos_tarefa.count({ where: { etapa_id: m.etapa, titulo: m.titulo } }),
      ).toBe(1);
    }
  });
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
async function entrar(email: string, senha: string): Promise<string> {
  const r = await request(app).post("/api/v1/auth/login").send({ email, senha });
  expect(r.status).toBe(200);
  return r.body.access;
}

describe("seedDemo — cenário obrigatório do G1", () => {
  beforeAll(async () => {
    await seedBase(prisma);
    await purgeDemo(prisma);
    const r = await seedDemo(prisma);
    expect(r.criado).toBe(true);
  });

  afterAll(async () => {
    await purgeDemo(prisma);
  });

  const equipesDemo = () =>
    prisma.equipes.findMany({
      where: { equipe_membros: { some: { papel: "lider", usuarios: { email: { endsWith: DEMO_DOMINIO } } } } },
      select: {
        nome_ideia: true,
        etapas: { select: { numero: true } },
        usuarios: { select: { email: true } },
        equipe_membros: {
          where: { ativo: true },
          select: { papel: true, usuarios: { select: { convite_aceito_em: true } } },
        },
        historico_etapas: { select: { etapa_destino_id: true } },
        tarefas: {
          select: { status: true, obrigatoria: true, data_entrega: true, etapas: { select: { numero: true } } },
        },
      },
    });

  it("3 equipes, cada uma com ≥4 membros ativos, exatamente 1 líder e ≥3 integrantes com convite aceito", async () => {
    const eqs = await equipesDemo();
    expect(eqs).toHaveLength(3);
    for (const e of eqs) {
      expect(e.equipe_membros.length).toBeGreaterThanOrEqual(4);
      expect(e.equipe_membros.filter((m) => m.papel === "lider")).toHaveLength(1);
      const integrantesComConvite = e.equipe_membros.filter(
        (m) => m.papel === "integrante" && m.usuarios.convite_aceito_em !== null,
      );
      expect(integrantesComConvite.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("4 mentores: mentor1 com 2 equipes, mentor2 com 1", async () => {
    expect(
      await prisma.usuarios.count({ where: { tipo_usuario: "mentor", email: { endsWith: DEMO_DOMINIO } } }),
    ).toBe(4);
    const eqs = await equipesDemo();
    const porMentor = eqs.reduce<Record<string, number>>((acc, e) => {
      const k = e.usuarios?.email ?? "-";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    expect(porMentor[`mentor1${DEMO_DOMINIO}`]).toBe(2);
    expect(porMentor[`mentor2${DEMO_DOMINIO}`]).toBe(1);
  });

  it("2 equipes com a Etapa 1 aprovada cursando a Etapa 2", async () => {
    const naDois = (await equipesDemo()).filter((e) => e.etapas.numero === 2);
    expect(naDois).toHaveLength(2);
    for (const e of naDois) {
      const e1 = e.tarefas.filter((t) => t.etapas.numero === 1 && t.obrigatoria);
      expect(e1.length).toBeGreaterThan(0);
      expect(e1.every((t) => t.status === "aprovada")).toBe(true);
      expect(e.historico_etapas.some((h) => h.etapa_destino_id === 2)).toBe(true);
    }
  });

  it("1 equipe com tarefa atrasada (visível pela API)", async () => {
    const access = await entrar(`mentor1${DEMO_DOMINIO}`, SENHAS_DEMO.mentor);
    const lista = await request(app).get("/api/v1/equipes").set(bearer(access));
    expect(lista.body.data).toHaveLength(2);
    let comAtraso = 0;
    for (const e of lista.body.data as Array<{ slug: string }>) {
      const t = await request(app).get(`/api/v1/equipes/${e.slug}/tarefas?status=atrasada`).set(bearer(access));
      if (t.body.data.length > 0) comAtraso++;
    }
    expect(comAtraso).toBe(1);
  });

  it("das 3 equipes demo, exatamente 1 tem tarefa atrasada (via prisma, mesma regra da RN-04)", async () => {
    const hoje = hojeISO();
    const eqs = await equipesDemo();
    expect(eqs).toHaveLength(3);
    const comAtraso = eqs.filter((e) =>
      e.tarefas.some(
        (t) =>
          (STATUS_SEM_ENTREGA as readonly string[]).includes(t.status) && dataISO(t.data_entrega) < hoje,
      ),
    );
    expect(comAtraso).toHaveLength(1);
  });

  it("todo aluno seedado tem curso na lista fechada da AMF e semestre válido ('1'..'10')", async () => {
    const alunos = await prisma.alunos.findMany({
      where: { usuarios: { email: { endsWith: DEMO_DOMINIO } } },
      select: { curso: true, semestre: true },
    });
    expect(alunos.length).toBeGreaterThan(0);
    for (const a of alunos) {
      expect(CURSOS_AMF).toContain(a.curso);
      expect(a.semestre).toMatch(/^(10|[1-9])$/);
    }
  });

  it("B1: cada perfil de demo tem 3–4 notificações realistas, todas canceladas", async () => {
    for (const u of ["mentor1", "bruna.lopes", "pedro.souza", "mariana.alves"]) {
      const n = await prisma.emails.count({
        where: { destinatario_email: `${u}${DEMO_DOMINIO}`, status: "cancelado" },
      });
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(4);
    }
    const doAdmin = await prisma.emails.count({
      where: {
        destinatario_email: ADMIN_EMAIL,
        status: "cancelado",
        equipes: { nome_ideia: { in: ["EcoRota", "SaúdeJá", "Aprende+"] } },
      },
    });
    expect(doAdmin).toBe(4);
    // nada do seed fica na fila de envio
    expect(
      await prisma.emails.count({
        where: { destinatario_email: { endsWith: DEMO_DOMINIO }, status: { not: "cancelado" } },
      }),
    ).toBe(0);

    const access = await entrar(`bruna.lopes${DEMO_DOMINIO}`, SENHAS_DEMO.aluno);
    const inbox = await request(app).get("/api/v1/notificacoes").set(bearer(access));
    expect(inbox.body.data.length).toBeGreaterThanOrEqual(3);
    expect(inbox.body.data[0].dados.equipe_slug).toBeTruthy();
  });

  it("ensaio da demo: A avança após aprovar a entrega; B é barrada pela RN-01", async () => {
    const access = await entrar(`mentor1${DEMO_DOMINIO}`, SENHAS_DEMO.mentor);
    const lista = await request(app).get("/api/v1/equipes").set(bearer(access));
    const slugDe = (nome: string) =>
      (lista.body.data as Array<{ slug: string; nomeIdeia: string }>).find((e) => e.nomeIdeia === nome)!.slug;

    const tarefasA = await request(app).get(`/api/v1/equipes/${slugDe("EcoRota")}/tarefas?status=entregue`).set(bearer(access));
    const entregas = await request(app).get(`/api/v1/tarefas/${tarefasA.body.data[0].slug}/entregas`).set(bearer(access));
    const av = await request(app)
      .post(`/api/v1/entregas/${entregas.body.data[0].slug}/avaliacoes`)
      .set(bearer(access))
      .send({ resultado: "aprovada", comentario: "Agendamento ok" });
    expect(av.status).toBe(201);
    const okA = await request(app).post(`/api/v1/equipes/${slugDe("EcoRota")}/etapa`).set(bearer(access)).send({ etapa: 3 });
    expect(okA.status).toBe(200);

    const b = await request(app).post(`/api/v1/equipes/${slugDe("SaúdeJá")}/etapa`).set(bearer(access)).send({ etapa: 3 });
    expect(b.status).toBe(409);
    expect(b.body.error.code).toBe("RN01_PENDENCIAS");
  });

  it("alunos e mentores logam com a senha do papel", async () => {
    await entrar(`bruna.lopes${DEMO_DOMINIO}`, SENHAS_DEMO.aluno);
    await entrar(`mentor3${DEMO_DOMINIO}`, SENHAS_DEMO.mentor);
  });

  it("rodar de novo não duplica nada", async () => {
    const antes = await prisma.usuarios.count({ where: { email: { endsWith: DEMO_DOMINIO } } });
    const r = await seedDemo(prisma);
    expect(r.criado).toBe(false);
    expect(await prisma.usuarios.count({ where: { email: { endsWith: DEMO_DOMINIO } } })).toBe(antes);
  });
});

describe("purgeDemo", () => {
  it("remove só a camada demo (3 equipes, 17 contas — 4 mentores + 13 alunos); a base fica", async () => {
    await seedDemo(prisma);
    const r = await purgeDemo(prisma);
    expect(r.equipes).toBe(3);
    expect(r.usuarios).toBe(17);
    expect(await prisma.usuarios.count({ where: { email: { endsWith: DEMO_DOMINIO } } })).toBe(0);
    expect(await prisma.usuarios.count({ where: { email: ADMIN_EMAIL } })).toBe(1);
    // pedidos de redefinição de OUTROS arquivos de teste também caem no sino do
    // admin da base (cancelados) — não são da camada demo.
    expect(
      await prisma.emails.count({
        where: { destinatario_email: ADMIN_EMAIL, status: "cancelado", tipo: { not: "recuperacao_senha" } },
      }),
    ).toBe(0);
  });
});
