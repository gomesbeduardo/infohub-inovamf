import type {
  AppState,
  Usuario,
  Equipe,
  EquipeMembro,
  EstagioIdeia,
  Tarefa,
  HistoricoEtapa,
  StatusTarefa,
  ArquivoEntrega,
  Entrega,
  AvaliacaoEntrega,
  ResultadoAvaliacao,
  AnotacaoInterna,
} from '@/domain/types';
import { STATUS_EQUIPE_LABEL } from '@/domain/labels';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Normaliza texto para comparação: minúsculo e sem acentos. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Gera um slug estável a partir de um texto. */
export function slugify(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function agora(): string {
  return new Date().toISOString();
}

// ── Autenticação ─────────────────────────────────────────────────────────────

export function autenticar(
  s: AppState,
  email: string,
  senha: string,
): Usuario | null {
  const alvo = normalizar(email);
  const usuario = s.usuarios.find(
    (u) => u.ativo && normalizar(u.email) === alvo,
  );
  if (!usuario || usuario.senha !== senha) return null;
  return usuario;
}

// ── Cadastro ─────────────────────────────────────────────────────────────────

export interface DadosCadastro {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  curso: string;
  semestre: string;
  integrantes: { nome: string; curso: string; semestre?: string }[];
  nomeIdeia: string;
  descricaoIdeia: string;
  areaId: number;
  estagioIdeia: EstagioIdeia;
  origemDivulgacao?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function vazio(v?: string): boolean {
  return !v || v.trim() === '';
}

/**
 * Valida os dados do formulário de cadastro. Retorna um mapa campo→mensagem;
 * objeto vazio (`{}`) significa válido. Quando o estado é fornecido, também
 * verifica se o e-mail já está cadastrado.
 */
export function validarCadastro(
  d: Partial<DadosCadastro>,
  s?: AppState,
): Record<string, string> {
  const erros: Record<string, string> = {};

  if (vazio(d.nome)) erros.nome = 'Informe seu nome.';

  if (vazio(d.email)) {
    erros.email = 'Informe seu e-mail.';
  } else if (!EMAIL_RE.test(d.email!.trim())) {
    erros.email = 'E-mail inválido.';
  } else if (
    s &&
    s.usuarios.some((u) => normalizar(u.email) === normalizar(d.email!))
  ) {
    erros.email = 'Este e-mail já está cadastrado.';
  }

  if (vazio(d.senha)) {
    erros.senha = 'Crie uma senha.';
  } else if (d.senha!.length < 6) {
    erros.senha = 'A senha deve ter ao menos 6 caracteres.';
  }

  if (vazio(d.telefone)) erros.telefone = 'Informe um telefone.';
  if (vazio(d.curso)) erros.curso = 'Informe seu curso.';
  if (vazio(d.nomeIdeia)) erros.nomeIdeia = 'Dê um nome à ideia.';
  if (vazio(d.descricaoIdeia)) erros.descricaoIdeia = 'Descreva a ideia.';

  if (
    d.areaId === undefined ||
    d.areaId === null ||
    Number.isNaN(d.areaId) ||
    d.areaId <= 0
  ) {
    erros.areaId = 'Escolha uma área.';
  }

  if (!d.estagioIdeia) erros.estagioIdeia = 'Selecione o estágio da ideia.';

  return erros;
}

/**
 * Cria (imutavelmente) a conta do aluno líder e a equipe/ideia na Etapa 1 a
 * partir dos dados do formulário. Não muta o estado recebido.
 */
export function criarEquipeDoFormulario(
  s: AppState,
  d: DadosCadastro,
): { estado: AppState; equipe: Equipe; usuario: Usuario } {
  const usuarioId = `u-${slugify(d.email.split('@')[0])}`;
  const usuario: Usuario = {
    id: usuarioId,
    nome: d.nome,
    email: d.email,
    senha: d.senha,
    telefone: d.telefone,
    tipo: 'aluno',
    ativo: true,
  };

  const slug = slugify(d.nomeIdeia);
  const equipeId = `eq-${slug}`;

  const membros: EquipeMembro[] = [
    {
      usuarioId,
      nome: d.nome,
      curso: d.curso,
      semestre: d.semestre || undefined,
      papel: 'lider',
      ativo: true,
    },
    ...d.integrantes
      .filter((it) => !vazio(it.nome))
      .map((it, i) => ({
        usuarioId: `${equipeId}-m${i + 2}`,
        nome: it.nome,
        curso: it.curso,
        semestre: it.semestre || undefined,
        papel: 'integrante' as const,
        ativo: true,
      })),
  ];

  const equipe: Equipe = {
    id: equipeId,
    nomeIdeia: d.nomeIdeia,
    slug,
    descricaoIdeia: d.descricaoIdeia,
    areaId: d.areaId,
    estagioIdeia: d.estagioIdeia,
    origemDivulgacao: d.origemDivulgacao,
    cicloId: s.ciclos[0]?.id ?? 1,
    etapaAtualId: 1,
    status: 'ativa',
    membros,
    criadoEm: agora(),
  };

  const estado: AppState = {
    ...s,
    usuarios: [...s.usuarios, usuario],
    alunos: [...s.alunos, { usuarioId, curso: d.curso, semestre: d.semestre }],
    equipes: [...s.equipes, equipe],
  };

  return { estado, equipe, usuario };
}

/**
 * Adiciona um integrante à equipe (papel `integrante`). Gera um id único e não
 * cria conta de acesso — segue o mesmo modelo do cadastro (integrantes são
 * nome + curso + semestre/módulo). Imutável; retorna o estado inalterado se a
 * equipe não existir.
 */
export function adicionarMembro(
  s: AppState,
  equipeId: string,
  dados: { nome: string; curso: string; semestre?: string },
): AppState {
  const equipe = s.equipes.find((e) => e.id === equipeId);
  if (!equipe) return s;
  if (vazio(dados.nome) || vazio(dados.curso)) return s;

  const existe = (id: string) =>
    s.usuarios.some((u) => u.id === id) ||
    equipe.membros.some((m) => m.usuarioId === id);
  let n = equipe.membros.length + 1;
  let usuarioId = `${equipeId}-m${n}`;
  while (existe(usuarioId)) usuarioId = `${equipeId}-m${++n}`;

  const membro: EquipeMembro = {
    usuarioId,
    nome: dados.nome.trim(),
    curso: dados.curso,
    semestre: dados.semestre || undefined,
    papel: 'integrante',
    ativo: true,
  };
  return {
    ...s,
    equipes: s.equipes.map((e) =>
      e.id === equipeId ? { ...e, membros: [...e.membros, membro] } : e,
    ),
  };
}

/**
 * Semestre/módulo de um membro da equipe. O membro pode trazer o período
 * consigo (cadastro novo); quando não traz, vale o que está no cadastro do
 * aluno (`alunos`), que é a fonte de quem tem conta de acesso.
 */
export function semestreDoMembro(s: AppState, m: EquipeMembro): string {
  return (
    m.semestre ??
    s.alunos.find((a) => a.usuarioId === m.usuarioId)?.semestre ??
    ''
  );
}

// ── Funil, etapas e atraso ───────────────────────────────────────────────────

export interface FiltrosFunil {
  busca?: string;
  curso?: string;
  areaId?: number;
  mentorId?: string;
  statusTarefa?: StatusTarefa;
  cicloId?: number;
}

/** Filtra equipes por busca (nome da ideia), curso, área, mentor e status de tarefa. */
export function filtrarEquipes(s: AppState, f: FiltrosFunil): Equipe[] {
  const busca = f.busca ? normalizar(f.busca) : '';
  const curso = f.curso ? normalizar(f.curso) : '';
  return s.equipes.filter((eq) => {
    if (busca && !normalizar(eq.nomeIdeia).includes(busca)) return false;
    if (curso && !eq.membros.some((m) => normalizar(m.curso) === curso)) return false;
    if (f.areaId !== undefined && eq.areaId !== f.areaId) return false;
    if (f.mentorId && eq.mentorId !== f.mentorId) return false;
    if (f.cicloId !== undefined && eq.cicloId !== f.cicloId) return false;
    if (
      f.statusTarefa &&
      !s.tarefas.some((t) => t.equipeId === eq.id && t.status === f.statusTarefa)
    ) {
      return false;
    }
    return true;
  });
}

/** Tarefas obrigatórias da etapa que ainda não foram aprovadas. */
export function tarefasObrigatoriasPendentes(
  s: AppState,
  equipeId: string,
  etapaId: number,
): Tarefa[] {
  return s.tarefas.filter(
    (t) =>
      t.equipeId === equipeId &&
      t.etapaId === etapaId &&
      t.obrigatoria &&
      t.status !== 'aprovada',
  );
}

function proximoIdHistorico(s: AppState): string {
  return `h-${s.historico.length + 1}`;
}

/**
 * Avança a equipe uma etapa. Sem `forcar`, respeita RN-01: não avança se há
 * obrigatória pendente (retorna o estado inalterado, sem histórico). Ao concluir
 * a etapa 6, marca a equipe como `pronta_inovamf`. Imutável.
 */
export function avancarEtapa(
  s: AppState,
  equipeId: string,
  opts: { forcar: boolean; autorId: string; observacao?: string },
): AppState {
  const equipe = s.equipes.find((e) => e.id === equipeId);
  if (!equipe) return s;

  const pendentes = tarefasObrigatoriasPendentes(s, equipeId, equipe.etapaAtualId);
  if (!opts.forcar && pendentes.length > 0) return s; // RN-01

  const base = {
    id: proximoIdHistorico(s),
    equipeId,
    movidoPor: opts.autorId,
    forcado: opts.forcar,
    observacao: opts.observacao,
    criadoEm: agora(),
  };

  // etapa 6 concluída → pronta para o InovAMF (etapa não muda)
  if (equipe.etapaAtualId >= 6) {
    const novaEquipe: Equipe = {
      ...equipe,
      status: 'pronta_inovamf',
      prontaInovamfEm: agora(),
    };
    const hist: HistoricoEtapa = { ...base, etapaOrigemId: 6, etapaDestinoId: 6 };
    return {
      ...s,
      equipes: s.equipes.map((e) => (e.id === equipeId ? novaEquipe : e)),
      historico: [...s.historico, hist],
    };
  }

  const destino = equipe.etapaAtualId + 1;
  const novaEquipe: Equipe = { ...equipe, etapaAtualId: destino };
  const hist: HistoricoEtapa = {
    ...base,
    etapaOrigemId: equipe.etapaAtualId,
    etapaDestinoId: destino,
  };
  return {
    ...s,
    equipes: s.equipes.map((e) => (e.id === equipeId ? novaEquipe : e)),
    historico: [...s.historico, hist],
  };
}

/** Retrocede a equipe uma etapa (nunca abaixo de 1). Reativa a equipe. Imutável. */
export function retrocederEtapa(
  s: AppState,
  equipeId: string,
  opts: { autorId: string; observacao?: string },
): AppState {
  const equipe = s.equipes.find((e) => e.id === equipeId);
  if (!equipe || equipe.etapaAtualId <= 1) return s;

  const destino = equipe.etapaAtualId - 1;
  const novaEquipe: Equipe = {
    ...equipe,
    etapaAtualId: destino,
    status: 'ativa',
    prontaInovamfEm: undefined,
  };
  const hist: HistoricoEtapa = {
    id: proximoIdHistorico(s),
    equipeId,
    etapaOrigemId: equipe.etapaAtualId,
    etapaDestinoId: destino,
    movidoPor: opts.autorId,
    forcado: false,
    observacao: opts.observacao,
    criadoEm: agora(),
  };
  return {
    ...s,
    equipes: s.equipes.map((e) => (e.id === equipeId ? novaEquipe : e)),
    historico: [...s.historico, hist],
  };
}

/**
 * Move a equipe para uma etapa arbitrária (1..6) ou para `pronta` (pronta para
 * o InovAMF) — usado pelo arraste do funil do mentor. Imutável.
 *
 * - Avançar (destino > atual) com obrigatória pendente na etapa atual exige
 *   `forcar` (RN-01); sem forçar, retorna o estado inalterado.
 * - Um salto de mais de uma etapa é sempre gravado como `forcado`.
 * - Retroceder reativa a equipe (`status: 'ativa'`).
 * - `destino: 'pronta'` marca `pronta_inovamf`; mover uma equipe pronta de volta
 *   a uma etapa a reativa.
 */
export function moverEquipeParaEtapa(
  s: AppState,
  equipeId: string,
  opts: {
    destino: number | 'pronta';
    autorId: string;
    forcar?: boolean;
    observacao?: string;
  },
): AppState {
  const equipe = s.equipes.find((e) => e.id === equipeId);
  if (!equipe) return s;

  const ehProntaAtual =
    equipe.status === 'pronta_inovamf' || equipe.status === 'encaminhada_inovamf';

  const baseHist = {
    id: proximoIdHistorico(s),
    equipeId,
    movidoPor: opts.autorId,
    observacao: opts.observacao,
    criadoEm: agora(),
  };

  // destino "pronta": conclui o funil (como avançar além da etapa 6)
  if (opts.destino === 'pronta') {
    if (ehProntaAtual) return s;
    const novaEquipe: Equipe = {
      ...equipe,
      status: 'pronta_inovamf',
      prontaInovamfEm: agora(),
    };
    const hist: HistoricoEtapa = {
      ...baseHist,
      etapaOrigemId: equipe.etapaAtualId,
      etapaDestinoId: equipe.etapaAtualId,
      forcado: opts.forcar ?? false,
    };
    return {
      ...s,
      equipes: s.equipes.map((e) => (e.id === equipeId ? novaEquipe : e)),
      historico: [...s.historico, hist],
    };
  }

  const destino = opts.destino;
  if (destino < 1 || destino > 6) return s; // fora do funil
  // mesma etapa e já ativa → nada a fazer
  if (destino === equipe.etapaAtualId && !ehProntaAtual) return s;

  const avancando = destino > equipe.etapaAtualId;
  // RN-01: avançar com obrigatória pendente na etapa atual exige forçar
  if (avancando && !opts.forcar) {
    const pendentes = tarefasObrigatoriasPendentes(s, equipeId, equipe.etapaAtualId);
    if (pendentes.length > 0) return s;
  }

  const salto = Math.abs(destino - equipe.etapaAtualId) > 1;
  const novaEquipe: Equipe = {
    ...equipe,
    etapaAtualId: destino,
    status: 'ativa',
    prontaInovamfEm: undefined,
  };
  const hist: HistoricoEtapa = {
    ...baseHist,
    etapaOrigemId: equipe.etapaAtualId,
    etapaDestinoId: destino,
    forcado: (opts.forcar ?? false) || (avancando && salto),
  };
  return {
    ...s,
    equipes: s.equipes.map((e) => (e.id === equipeId ? novaEquipe : e)),
    historico: [...s.historico, hist],
  };
}

// ── Planejamento de movimento no funil (confirmação da UI) ───────────────────

/** Rótulo humano de uma coluna do funil: etapa numerada ou "Pronta p/ InovAMF". */
const LABEL_PRONTA = 'Pronta p/ InovAMF';

function rotuloEtapa(s: AppState, id: number): string {
  const et = s.etapas.find((e) => e.id === id);
  return et ? `${et.numero}. ${et.nome}` : `Etapa ${id}`;
}

/**
 * Descrição do efeito de arrastar uma equipe para uma coluna do funil. A UI usa
 * para montar a confirmação (ou o aviso de desfazer, quando silenciada) sem
 * duplicar as regras de no-op/RN-01 que já vivem em `moverEquipeParaEtapa`.
 */
export interface MovimentoPlano {
  equipe: Equipe;
  destino: number | 'pronta';
  origemLabel: string;
  destinoLabel: string;
  /** Avanço com obrigatória(s) pendente(s) na etapa atual (RN-01): move forçado. */
  forcado: boolean;
  pendentes: number;
}

/**
 * Planeja o arraste de uma equipe para `destino`, ou `null` quando o arraste não
 * muda nada (soltar na mesma coluna). Função pura: espelha os no-ops e a RN-01 de
 * `moverEquipeParaEtapa`, servindo a UI decidir entre confirmar e executar.
 */
export function planejarMovimento(
  s: AppState,
  equipeId: string,
  destino: number | 'pronta',
): MovimentoPlano | null {
  const equipe = s.equipes.find((e) => e.id === equipeId);
  if (!equipe) return null;

  const ehProntaAtual =
    equipe.status === 'pronta_inovamf' || equipe.status === 'encaminhada_inovamf';

  // no-op: soltar na mesma coluna
  if (destino === 'pronta') {
    if (ehProntaAtual) return null;
  } else {
    if (destino < 1 || destino > 6) return null;
    if (destino === equipe.etapaAtualId && !ehProntaAtual) return null;
  }

  const avancando =
    typeof destino === 'number' && !ehProntaAtual && destino > equipe.etapaAtualId;
  const pendentes = avancando
    ? tarefasObrigatoriasPendentes(s, equipeId, equipe.etapaAtualId).length
    : 0;

  return {
    equipe,
    destino,
    origemLabel: ehProntaAtual ? LABEL_PRONTA : rotuloEtapa(s, equipe.etapaAtualId),
    destinoLabel: destino === 'pronta' ? LABEL_PRONTA : rotuloEtapa(s, destino),
    forcado: pendentes > 0,
    pendentes,
  };
}

// ── Série temporal do mentor (gráfico de linha) ──────────────────────────────

const MS_DIA = 86_400_000;

/** Parte-data (YYYY-MM-DD) de um ISO com ou sem hora. */
function diaISO(iso: string): string {
  return iso.slice(0, 10);
}

/** Soma `n` dias a uma data YYYY-MM-DD (UTC), devolvendo YYYY-MM-DD. */
function somarDias(dia: string, n: number): string {
  const t = Date.parse(`${dia}T00:00:00Z`) + n * MS_DIA;
  return new Date(t).toISOString().slice(0, 10);
}

/** Dias inteiros entre dois dias YYYY-MM-DD (a - b). */
function diffDias(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / MS_DIA);
}

/** Um ponto da série semanal do mentor. */
export interface PontoSerieSemanal {
  /** Primeiro dia (YYYY-MM-DD) da janela de 7 dias. */
  semanaInicio: string;
  /** Rótulo curto DD/MM do início da semana. */
  rotulo: string;
  /** Avanços de etapa das equipes do mentor na semana. */
  avancos: number;
  /** Entregas concluídas (tarefas aprovadas) das equipes do mentor na semana. */
  entregas: number;
}

/**
 * Série semanal das equipes visíveis ao `usuario` (mentor): avanços de etapa
 * (de `historico`) e entregas concluídas (de `tarefa.concluidaEm`), em `semanas`
 * janelas de 7 dias terminando em `hoje` (YYYY-MM-DD). Função pura.
 */
export function serieSemanalMentor(
  s: AppState,
  usuario: Usuario,
  hoje: string,
  semanas = 8,
): PontoSerieSemanal[] {
  const ids = new Set(equipesVisiveis(s, usuario).map((e) => e.id));

  const buckets: PontoSerieSemanal[] = Array.from({ length: semanas }, (_, i) => {
    // i=0 é a semana mais antiga; i=semanas-1 é a semana corrente
    const semanasAtras = semanas - 1 - i;
    const inicio = somarDias(hoje, -(semanasAtras * 7 + 6));
    const [, mes, dia] = inicio.split('-');
    return { semanaInicio: inicio, rotulo: `${dia}/${mes}`, avancos: 0, entregas: 0 };
  });

  /** Índice do bucket para uma data-evento, ou -1 se fora da janela. */
  const indice = (iso: string): number => {
    const dd = diffDias(hoje, diaISO(iso)); // dias atrás (>=0 no passado)
    if (dd < 0) return -1; // futuro
    const semanasAtras = Math.floor(dd / 7);
    if (semanasAtras >= semanas) return -1;
    return semanas - 1 - semanasAtras;
  };

  for (const h of s.historico) {
    if (!ids.has(h.equipeId)) continue;
    if (h.etapaDestinoId <= (h.etapaOrigemId ?? 0)) continue; // só avanços
    const i = indice(h.criadoEm);
    if (i >= 0) buckets[i].avancos += 1;
  }

  for (const t of s.tarefas) {
    if (!ids.has(t.equipeId) || !t.concluidaEm) continue;
    const i = indice(t.concluidaEm);
    if (i >= 0) buckets[i].entregas += 1;
  }

  return buckets;
}

/**
 * Marca como `atrasada` toda tarefa `pendente`/`em_andamento` cuja data de
 * entrega já passou em relação a `hoje` (ISO YYYY-MM-DD). Imutável.
 */
export function calcularStatusAtraso(s: AppState, hoje: string): AppState {
  const tarefas = s.tarefas.map((t) =>
    (t.status === 'pendente' || t.status === 'em_andamento') && t.dataEntrega < hoje
      ? { ...t, status: 'atrasada' as StatusTarefa }
      : t,
  );
  return { ...s, tarefas };
}

// ── Tarefas, entregas e avaliação ────────────────────────────────────────────

export type NovaTarefaManual = {
  titulo: string;
  descricao?: string;
  etapaId: number;
  dataEntrega: string;
  obrigatoria: boolean;
  criadoPor: string;
};

export type NovaTarefaModelo = {
  modeloId: number;
  dataEntrega: string;
  criadoPor: string;
};

/**
 * Cria uma tarefa (status `pendente`) para a equipe, seja com dados manuais ou
 * copiando de um modelo de tarefa da etapa. Imutável.
 */
export function criarTarefa(
  s: AppState,
  equipeId: string,
  dados: NovaTarefaManual | NovaTarefaModelo,
): AppState {
  let campos: {
    titulo: string;
    descricao?: string;
    etapaId: number;
    obrigatoria: boolean;
  };

  if ('modeloId' in dados) {
    const modelo = s.modelosTarefa.find((m) => m.id === dados.modeloId);
    if (!modelo) return s;
    campos = {
      titulo: modelo.titulo,
      descricao: modelo.descricao,
      etapaId: modelo.etapaId,
      obrigatoria: modelo.obrigatoria,
    };
  } else {
    campos = {
      titulo: dados.titulo,
      descricao: dados.descricao,
      etapaId: dados.etapaId,
      obrigatoria: dados.obrigatoria,
    };
  }

  const tarefa: Tarefa = {
    id: `t-${s.tarefas.length + 1}`,
    equipeId,
    etapaId: campos.etapaId,
    titulo: campos.titulo,
    descricao: campos.descricao,
    obrigatoria: campos.obrigatoria,
    dataEntrega: dados.dataEntrega,
    status: 'pendente',
    criadoPor: dados.criadoPor,
  };

  return { ...s, tarefas: [...s.tarefas, tarefa] };
}

/**
 * Registra uma entrega para a tarefa (versão = maior versão atual + 1) e move a
 * tarefa para `entregue`. Imutável.
 */
export function enviarEntrega(
  s: AppState,
  tarefaId: string,
  dados: { enviadoPor: string; arquivos: ArquivoEntrega[]; comentario?: string },
): AppState {
  const tarefa = s.tarefas.find((t) => t.id === tarefaId);
  if (!tarefa) return s;

  const versaoAtual = s.entregas
    .filter((e) => e.tarefaId === tarefaId)
    .reduce((max, e) => Math.max(max, e.versao), 0);

  const entrega: Entrega = {
    id: `en-${s.entregas.length + 1}`,
    tarefaId,
    versao: versaoAtual + 1,
    enviadoPor: dados.enviadoPor,
    comentario: dados.comentario,
    arquivos: dados.arquivos,
    criadoEm: agora(),
  };

  return {
    ...s,
    entregas: [...s.entregas, entrega],
    tarefas: s.tarefas.map((t) =>
      t.id === tarefaId ? { ...t, status: 'entregue' as StatusTarefa } : t,
    ),
  };
}

/**
 * Avalia uma entrega: `aprovada` deixa a tarefa `aprovada` com `concluidaEm`;
 * `ajustar` deixa a tarefa `ajustar`. Registra a `AvaliacaoEntrega`. Imutável.
 */
export function avaliarEntrega(
  s: AppState,
  entregaId: string,
  dados: {
    resultado: ResultadoAvaliacao;
    comentario?: string;
    avaliadorId: string;
  },
): AppState {
  const entrega = s.entregas.find((e) => e.id === entregaId);
  if (!entrega) return s;

  const avaliacao: AvaliacaoEntrega = {
    id: `av-${s.avaliacoes.length + 1}`,
    entregaId,
    avaliadorId: dados.avaliadorId,
    resultado: dados.resultado,
    comentario: dados.comentario,
    criadoEm: agora(),
  };

  const novoStatus: StatusTarefa =
    dados.resultado === 'aprovada' ? 'aprovada' : 'ajustar';

  return {
    ...s,
    avaliacoes: [...s.avaliacoes, avaliacao],
    tarefas: s.tarefas.map((t) =>
      t.id === entrega.tarefaId
        ? {
            ...t,
            status: novoStatus,
            concluidaEm:
              dados.resultado === 'aprovada' ? agora() : t.concluidaEm,
          }
        : t,
    ),
  };
}

// ── Indicadores (dashboard) ──────────────────────────────────────────────────

export interface Indicadores {
  equipesAtivas: number;
  prontasInovamf: number;
  tarefasAtrasadas: number;
  totalEquipes: number;
  porEtapa: { etapaId: number; numero: number; nome: string; total: number }[];
}

/** Indicadores consolidados do funil para o painel de coordenação (RF-22). */
export function calcularIndicadores(s: AppState): Indicadores {
  const ehPronta = (st: string) =>
    st === 'pronta_inovamf' || st === 'encaminhada_inovamf';

  const porEtapa = [...s.etapas]
    .sort((a, b) => a.numero - b.numero)
    .map((et) => ({
      etapaId: et.id,
      numero: et.numero,
      nome: et.nome,
      total: s.equipes.filter(
        (e) => e.status === 'ativa' && e.etapaAtualId === et.id,
      ).length,
    }));

  return {
    equipesAtivas: s.equipes.filter((e) => e.status === 'ativa').length,
    prontasInovamf: s.equipes.filter((e) => ehPronta(e.status)).length,
    tarefasAtrasadas: s.tarefas.filter((t) => t.status === 'atrasada').length,
    totalEquipes: s.equipes.length,
    porEtapa,
  };
}

/** Data de hoje em ISO (YYYY-MM-DD), para o cálculo de atraso. */
export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Anotações internas e visibilidade ────────────────────────────────────────

/** Adiciona uma anotação interna (não visível ao aluno) à equipe. Imutável. */
export function adicionarAnotacao(
  s: AppState,
  dados: { equipeId: string; etapaId?: number; autorId: string; conteudo: string },
): AppState {
  const anotacao: AnotacaoInterna = {
    id: `an-${s.anotacoes.length + 1}`,
    equipeId: dados.equipeId,
    etapaId: dados.etapaId,
    autorId: dados.autorId,
    conteudo: dados.conteudo,
    criadoEm: agora(),
  };
  return { ...s, anotacoes: [...s.anotacoes, anotacao] };
}

/**
 * Equipes visíveis para o usuário (RNF-03): admin vê todas; mentor vê só as que
 * mentora; aluno vê só a própria equipe.
 */
export function equipesVisiveis(s: AppState, usuario: Usuario): Equipe[] {
  if (usuario.tipo === 'admin') return s.equipes;
  if (usuario.tipo === 'mentor') {
    return s.equipes.filter((e) => e.mentorId === usuario.id);
  }
  return s.equipes.filter((e) =>
    e.membros.some((m) => m.usuarioId === usuario.id),
  );
}

// ── Exportação CSV (RF-23) ───────────────────────────────────────────────────

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Gera um CSV (string) da lista de equipes com seus status, para exportação. */
export function equipesParaCSV(s: AppState, equipes: Equipe[]): string {
  const header = [
    'Ideia',
    'Área',
    'Etapa',
    'Status',
    'Mentor',
    'Curso do líder',
    'Tarefas atrasadas',
  ];
  const linhas = equipes.map((e) => {
    const area = s.areas.find((a) => a.id === e.areaId)?.nome ?? '';
    const etapa = s.etapas.find((et) => et.id === e.etapaAtualId);
    const mentor = s.usuarios.find((u) => u.id === e.mentorId)?.nome ?? '';
    const lider = e.membros.find((m) => m.papel === 'lider')?.curso ?? '';
    const atrasadas = s.tarefas.filter(
      (t) => t.equipeId === e.id && t.status === 'atrasada',
    ).length;
    return [
      e.nomeIdeia,
      area,
      etapa ? `${etapa.numero}. ${etapa.nome}` : '',
      STATUS_EQUIPE_LABEL[e.status],
      mentor,
      lider,
      String(atrasadas),
    ];
  });
  return [header, ...linhas]
    .map((row) => row.map(csvCell).join(','))
    .join('\n');
}

// ── Gestão de contas (RF-03) e recuperação de senha (RF-01) ──────────────────

export function criarUsuario(
  s: AppState,
  dados: {
    nome: string;
    email: string;
    senha: string;
    telefone: string;
    tipo: 'admin' | 'mentor';
  },
): AppState {
  const usuario: Usuario = {
    id: `u-${slugify(dados.email.split('@')[0])}`,
    nome: dados.nome,
    email: dados.email,
    senha: dados.senha,
    telefone: dados.telefone,
    tipo: dados.tipo,
    ativo: true,
  };
  return { ...s, usuarios: [...s.usuarios, usuario] };
}

export function editarUsuario(
  s: AppState,
  id: string,
  dados: Partial<Pick<Usuario, 'nome' | 'email' | 'telefone' | 'tipo' | 'senha'>>,
): AppState {
  return {
    ...s,
    usuarios: s.usuarios.map((u) => (u.id === id ? { ...u, ...dados } : u)),
  };
}

export function definirAtivoUsuario(
  s: AppState,
  id: string,
  ativo: boolean,
): AppState {
  return {
    ...s,
    usuarios: s.usuarios.map((u) => (u.id === id ? { ...u, ativo } : u)),
  };
}

/** Recuperação de senha mockada: redefine a senha se o e-mail existir. */
export function redefinirSenha(
  s: AppState,
  email: string,
  novaSenha: string,
): { estado: AppState; ok: boolean } {
  const alvo = normalizar(email);
  const existe = s.usuarios.some((u) => normalizar(u.email) === alvo);
  if (!existe) return { estado: s, ok: false };
  return {
    estado: {
      ...s,
      usuarios: s.usuarios.map((u) =>
        normalizar(u.email) === alvo ? { ...u, senha: novaSenha } : u,
      ),
    },
    ok: true,
  };
}
