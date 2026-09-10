import { seed } from '@/data/fixtures';
import { calcularIndicadores } from '@/data/repository';
import { STATUS_EQUIPE_LABEL } from '@/domain/labels';

/**
 * Conteúdo da landing pública. Os números e os casos vêm do mesmo adaptador de
 * dados do app (hoje memória, amanhã persistência real) — a página nunca
 * inventa estatística nem duplica regra de domínio.
 */

export interface EtapaVitrine {
  numero: number;
  nome: string;
  entregavel: string;
}

export interface CasoVitrine {
  id: string;
  nomeIdeia: string;
  descricao: string;
  area: string;
  status: string;
  integrantes: number;
  cursos: string[];
}

export interface NumeroVitrine {
  valor: string;
  rotulo: string;
}

const estado = seed();

/** As 6 etapas da jornada InfoHub → InovAMF, com o entregável de cada uma. */
export const ETAPAS_VITRINE: EtapaVitrine[] = [...estado.etapas]
  .sort((a, b) => a.numero - b.numero)
  .map((e) => ({ numero: e.numero, nome: e.nome, entregavel: e.entregavel }));

/** Números do programa exibidos no hero (RF-22 — mesma fonte do dashboard). */
export const NUMEROS_VITRINE: NumeroVitrine[] = (() => {
  const i = calcularIndicadores(estado);
  const alunos = new Set(
    estado.equipes.flatMap((e) => e.membros.map((m) => m.usuarioId)),
  ).size;
  return [
    { valor: String(i.totalEquipes), rotulo: 'ideias no InfoHub' },
    { valor: String(i.equipesAtivas), rotulo: 'equipes ativas agora' },
    { valor: String(alunos), rotulo: 'alunos participando' },
    { valor: String(i.prontasInovamf), rotulo: 'prontas para o InovAMF' },
  ];
})();

/** Áreas de atuação aceitas nas ideias (lista configurável — RF, seção 4.2). */
export const AREAS_VITRINE: string[] = estado.areas.map((a) => a.nome);

/** Equipes que chegaram ao fim do funil — a vitrine de casos do programa. */
export const CASOS_VITRINE: CasoVitrine[] = estado.equipes
  .filter(
    (e) =>
      e.status === 'pronta_inovamf' || e.status === 'encaminhada_inovamf',
  )
  .slice(0, 3)
  .map((e) => ({
    id: e.id,
    nomeIdeia: e.nomeIdeia,
    descricao: e.descricaoIdeia,
    area: estado.areas.find((a) => a.id === e.areaId)?.nome ?? '—',
    status: STATUS_EQUIPE_LABEL[e.status],
    integrantes: e.membros.filter((m) => m.ativo).length,
    cursos: Array.from(new Set(e.membros.map((m) => m.curso))).slice(0, 3),
  }));

/** Equipes em andamento, mostradas como "quem está no programa agora". */
export const EQUIPES_VITRINE: CasoVitrine[] = estado.equipes
  .filter((e) => e.status === 'ativa' && e.etapaAtualId >= 3)
  .slice(0, 4)
  .map((e) => ({
    id: e.id,
    nomeIdeia: e.nomeIdeia,
    descricao: e.descricaoIdeia,
    area: estado.areas.find((a) => a.id === e.areaId)?.nome ?? '—',
    status: `Etapa ${e.etapaAtualId}`,
    integrantes: e.membros.filter((m) => m.ativo).length,
    cursos: Array.from(new Set(e.membros.map((m) => m.curso))).slice(0, 3),
  }));
