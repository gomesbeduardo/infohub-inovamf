import type { NextFunction, Request, Response } from "express";
import { escopoDo } from "../utils/acesso.js";
import { toSlug } from "../utils/slug.js";
import { hojeISO, somarDias, statusEfetivo } from "../domain/atraso.js";
import { ehAvanco, serieSemanal } from "../domain/serie.js";
import * as dashboardModel from "../models/dashboard.model.js";
import * as equipeModel from "../models/equipe.model.js";

const SEMANAS = 8;

// GET /dashboard — admin (tudo) e mentor (só as suas equipes). RF-22.
export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    const escopo = escopoDo(req);
    const hoje = hojeISO();
    // Margem de 1 dia: o filtro é em UTC e a janela é contada pela data de SP.
    const desde = somarDias(hoje, -(SEMANAS * 7));
    const [ind, ev] = await Promise.all([
      dashboardModel.indicadores(escopo, hoje),
      dashboardModel.eventosSerie(escopo, desde),
    ]);
    const avancos = ev.historico
      .filter((h) =>
        ehAvanco({
          origem: h.etapas_historico_etapas_etapa_origem_idToetapas?.numero ?? null,
          destino: h.etapas_historico_etapas_etapa_destino_idToetapas.numero,
          statusOrigem: h.status_origem,
          statusDestino: h.status_destino,
        }),
      )
      .map((h) => hojeISO(h.criado_em));
    const entregasRecebidas = ev.entregasCriadas.map((e) => hojeISO(e.criado_em));
    const entregasAvaliadas = ev.avaliacoes.map((a) => hojeISO(a.criado_em));
    const tarefasConcluidas = ev.concluidas.map((t) => hojeISO(t.concluida_em as Date));
    res.json({
      ...ind,
      serieSemanal: serieSemanal(hoje, SEMANAS, avancos, entregasRecebidas, entregasAvaliadas, tarefasConcluidas),
    });
  } catch (err) {
    next(err);
  }
}

// Cartões da mesa do mentor. Pendências (RN-01/RN-02) e último evento vêm das
// MESMAS funções do detalhe e da linha do tempo — nada de regra duplicada em
// SQL. São ~5 consultas por equipe (7 na Etapa 6), em paralelo: aceitável
// porque o mentor tem poucas equipes e a lista tem teto (LIMITE_AGENDA). Por
// isso o admin (todas as equipes) não recebe cartões.
async function cartoesDoMentor(mentorId: string) {
  const equipes = await dashboardModel.equipesDoMentor(mentorId);
  return Promise.all(
    equipes.map(async (e) => {
      const [pendencias, [ultimo]] = await Promise.all([
        equipeModel.pendenciasParaAvancar(e.id),
        equipeModel.linhaDoTempo(e.id, { paraAluno: false, limite: 1 }),
      ]);
      return {
        slug: e.slug,
        nomeIdeia: e.nome_ideia,
        status: e.status,
        etapa: { numero: e.etapas.numero, nome: e.etapas.nome },
        membrosAtivos: e._count.equipe_membros,
        faltamParaAvancar: pendencias.length,
        ultimoEvento: ultimo ? { titulo: ultimo.titulo, em: ultimo.em } : null,
      };
    }),
  );
}

// GET /dashboard/agenda — admin (tudo) e mentor (só as suas equipes). Adendo
// 23/09: "para avaliar", "prazos" e, só para o mentor, os cartões das equipes.
export async function agenda(req: Request, res: Response, next: NextFunction) {
  try {
    const escopo = escopoDo(req);
    const hoje = hojeISO();
    const [avaliar, prazos, equipes] = await Promise.all([
      dashboardModel.aguardandoAvaliacao(escopo),
      dashboardModel.prazosDaSemana(escopo, hoje),
      escopo.tipo === "mentor" ? cartoesDoMentor(escopo.usuarioId) : Promise.resolve([]),
    ]);
    res.json({
      data: {
        paraAvaliar: avaliar.map((t) => ({
          equipe: { slug: t.equipes.slug, nomeIdeia: t.equipes.nome_ideia },
          tarefa: { slug: toSlug(t.id), titulo: t.titulo },
          versao: t.entregas[0]?.versao ?? null,
          entregueEm: t.entregas[0]?.criado_em ?? null,
        })),
        prazos: prazos.map((t) => ({
          equipe: { slug: t.equipes.slug, nomeIdeia: t.equipes.nome_ideia },
          tarefa: { slug: toSlug(t.id), titulo: t.titulo },
          dataEntrega: t.data_entrega,
          status: statusEfetivo(t.status, t.data_entrega, hoje),
        })),
        equipes,
      },
    });
  } catch (err) {
    next(err);
  }
}
