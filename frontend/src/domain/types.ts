// Tipos de domínio derivados do schema (docs/sql/infohub_schema.sql) e dos
// requisitos (docs/Infohub_InovAMF_Requisitos.md). Ver plan.md §6.

export type TipoUsuario = 'admin' | 'mentor' | 'aluno';
export type EstagioIdeia = 'ideia' | 'prototipo' | 'mvp_desenvolvimento' | 'mvp_pronto';
export type StatusTarefa =
  | 'pendente'
  | 'em_andamento'
  | 'entregue'
  | 'atrasada'
  | 'aprovada'
  | 'ajustar';
export type StatusEquipe =
  | 'ativa'
  | 'pronta_inovamf'
  | 'encaminhada_inovamf'
  | 'pausada'
  | 'desistente';
export type PapelMembro = 'lider' | 'integrante';
export type TipoArquivo = 'arquivo' | 'link';
export type ResultadoAvaliacao = 'aprovada' | 'ajustar';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  tipo: TipoUsuario;
  ativo: boolean;
}

export interface AlunoInfo {
  usuarioId: string;
  curso: string;
  semestre: string;
}

export interface Area {
  id: number;
  nome: string;
}

export interface Etapa {
  id: number;
  numero: number;
  nome: string;
  entregavel: string;
}

export interface Ciclo {
  id: number;
  nome: string;
}

export interface EquipeMembro {
  usuarioId: string;
  nome: string;
  curso: string;
  /** Período no curso (1..10). Semestre ou módulo, conforme o curso. */
  semestre?: string;
  papel: PapelMembro;
  ativo: boolean;
}

export interface Equipe {
  id: string;
  nomeIdeia: string;
  slug: string;
  descricaoIdeia: string;
  areaId: number;
  estagioIdeia: EstagioIdeia;
  origemDivulgacao?: string;
  mentorId?: string;
  cicloId: number;
  etapaAtualId: number;
  status: StatusEquipe;
  membros: EquipeMembro[];
  prontaInovamfEm?: string;
  criadoEm: string;
}

export interface HistoricoEtapa {
  id: string;
  equipeId: string;
  etapaOrigemId?: number;
  etapaDestinoId: number;
  movidoPor?: string;
  forcado: boolean;
  observacao?: string;
  criadoEm: string;
}

export interface AnotacaoInterna {
  id: string;
  equipeId: string;
  etapaId?: number;
  autorId: string;
  conteudo: string;
  criadoEm: string;
}

export interface ModeloTarefa {
  id: number;
  etapaId: number;
  titulo: string;
  descricao?: string;
  obrigatoria: boolean;
  prazoPadraoDias: number;
}

export interface Tarefa {
  id: string;
  equipeId: string;
  etapaId: number;
  titulo: string;
  descricao?: string;
  obrigatoria: boolean;
  dataEntrega: string;
  status: StatusTarefa;
  criadoPor?: string;
  concluidaEm?: string;
}

export interface ArquivoEntrega {
  id: string;
  tipo: TipoArquivo;
  nomeOriginal?: string;
  urlExterna?: string;
}

export interface Entrega {
  id: string;
  tarefaId: string;
  versao: number;
  enviadoPor: string;
  comentario?: string;
  arquivos: ArquivoEntrega[];
  criadoEm: string;
}

export interface AvaliacaoEntrega {
  id: string;
  entregaId: string;
  avaliadorId: string;
  resultado: ResultadoAvaliacao;
  comentario?: string;
  criadoEm: string;
}

export interface AppState {
  usuarios: Usuario[];
  alunos: AlunoInfo[];
  areas: Area[];
  etapas: Etapa[];
  ciclos: Ciclo[];
  equipes: Equipe[];
  historico: HistoricoEtapa[];
  anotacoes: AnotacaoInterna[];
  modelosTarefa: ModeloTarefa[];
  tarefas: Tarefa[];
  entregas: Entrega[];
  avaliacoes: AvaliacaoEntrega[];
}
