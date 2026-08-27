import type {
  AppState,
  Usuario,
  Equipe,
  EquipeMembro,
  EstagioIdeia,
  Tarefa,
  HistoricoEtapa,
  StatusTarefa,
} from '@/domain/types';

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
  integrantes: { nome: string; curso: string }[];
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
    { usuarioId, nome: d.nome, curso: d.curso, papel: 'lider', ativo: true },
    ...d.integrantes
      .filter((it) => !vazio(it.nome))
      .map((it, i) => ({
        usuarioId: `${equipeId}-m${i + 2}`,
        nome: it.nome,
        curso: it.curso,
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

// ── Funil, etapas e atraso ───────────────────────────────────────────────────

export interface FiltrosFunil {
  busca?: string;
  curso?: string;
  areaId?: number;
  mentorId?: string;
  statusTarefa?: StatusTarefa;
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
