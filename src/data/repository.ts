import type {
  AppState,
  Usuario,
  Equipe,
  EquipeMembro,
  EstagioIdeia,
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
