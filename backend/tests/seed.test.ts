import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { ADMIN_EMAIL, ADMIN_SENHA, CICLO_ATUAL, MODELOS_TAREFA, seedBase } from "../src/seed/base.js";
import { DEMO_DOMINIO, SENHAS_DEMO, seedDemo } from "../src/seed/demo.js";
import { purgeDemo } from "../src/seed/purge-demo.js";

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
        equipe_membros: { where: { ativo: true }, select: { papel: true } },
        historico_etapas: { select: { etapa_destino_id: true } },
        tarefas: { select: { status: true, obrigatoria: true, etapas: { select: { numero: true } } } },
      },
    });

  it("3 equipes, cada uma com ≥3 integrantes e exatamente 1 líder", async () => {
    const eqs = await equipesDemo();
    expect(eqs).toHaveLength(3);
    for (const e of eqs) {
      expect(e.equipe_membros.length).toBeGreaterThanOrEqual(3);
      expect(e.equipe_membros.filter((m) => m.papel === "lider")).toHaveLength(1);
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
  it("remove só a camada demo; a base fica", async () => {
    await seedDemo(prisma);
    const r = await purgeDemo(prisma);
    expect(r.equipes).toBe(3);
    expect(await prisma.usuarios.count({ where: { email: { endsWith: DEMO_DOMINIO } } })).toBe(0);
    expect(await prisma.usuarios.count({ where: { email: ADMIN_EMAIL } })).toBe(1);
  });
});
