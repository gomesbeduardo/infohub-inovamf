import type {
  EstagioIdeia,
  PapelMembro,
  ResultadoAvaliacao,
  StatusEquipe,
  StatusTarefa,
  TipoUsuario,
} from '@/domain/types';

// DTOs exatamente como a API /api/v1 responde (ver backend/src/controllers).
export interface Pagina<T> { data: T[]; page: number; perPage: number; total: number }
export interface Ref { slug: string; nome: string }
export interface EtapaRef { numero: number; nome: string }

export interface Etapa { numero: number; nome: string; descricao: string | null; entregavel: string | null }
export interface Area { nome: string; ordem: number }
export interface Ciclo { nome: string; dataInicio: string; dataFim: string | null }
export interface ModeloTarefa {
  id: number; etapa: number; titulo: string; descricao: string | null; obrigatoria: boolean; prazoPadraoDias: number;
}

export interface EquipeResumo {
  slug: string; nomeIdeia: string; descricaoIdeia: string; status: StatusEquipe; estagio: EstagioIdeia;
  etapa: EtapaRef; area: string | null; ciclo: string | null; mentor: Ref | null;
  lider: (Ref & { curso: string | null }) | null; membrosCount: number; tarefasAtrasadas: number; criadoEm: string;
}

export type Pendencia =
  | { tipo: 'tarefa'; slug: string; titulo: string }
  | { tipo: 'integrante'; slug: string; nome: string; motivo: 'convite_pendente' | 'dados_incompletos' };

export interface Membro {
  slug: string; nome: string; papel: PapelMembro; tipo: TipoUsuario; pendente: boolean;
  curso: string | null; semestre: string | null;
}
export type Posicao = number | 'pronta';
export interface MovimentoHistorico {
  de: Posicao | null; para: Posicao; forcado: boolean; observacao: string | null; por: Ref | null; em: string;
}
export interface EquipeDetalhe {
  slug: string; nomeIdeia: string; descricaoIdeia: string; estagio: EstagioIdeia; status: StatusEquipe;
  origemDivulgacao: string | null; prontaInovamfEm: string | null; criadoEm: string; etapa: EtapaRef;
  area: string | null; ciclo: string | null; mentor: Ref | null; membros: Membro[];
  historico: MovimentoHistorico[]; pendenciasParaAvancar: Pendencia[];
}

export interface Tarefa {
  slug: string; titulo: string; descricao: string | null; obrigatoria: boolean; dataEntrega: string;
  status: StatusTarefa; etapa: EtapaRef; equipe: { slug: string; nomeIdeia: string };
  criadoEm: string; concluidaEm: string | null;
}
export interface Arquivo { tipo: 'arquivo' | 'link'; nome: string | null; url: string | null }
export interface Avaliacao { resultado: ResultadoAvaliacao; comentario: string | null; por: Ref; em: string }
export interface Entrega {
  slug: string; versao: number; comentario: string | null; enviadoPor: Ref; criadoEm: string;
  arquivos: Arquivo[]; avaliacoes: Avaliacao[];
}

export interface Anotacao { slug: string; conteudo: string; autor: Ref; etapa: number | null; criadoEm: string }

export interface Dashboard {
  equipesAtivas: number; prontasInovamf: number; totalEquipes: number; tarefasAtrasadas: number; aAvaliar: number;
  porEtapa: Array<{ numero: number; nome: string; total: number }>;
  serieSemanal: Array<{ semanaInicio: string; rotulo: string; avancos: number; entregas: number }>;
}

/** GET /publico/numeros — agregados reais para o hero da landing (issue #157). */
export interface NumerosPublicos {
  ideias: number; equipesEmAndamento: number; alunos: number; cursos: number;
}

export interface UsuarioAdmin {
  slug: string; nome: string; email: string; telefone: string; role: TipoUsuario; ativo: boolean;
  conviteAceito: boolean; ultimoLoginEm?: string | null; criadoEm?: string;
}
export interface Me {
  slug: string; nome: string; email: string; telefone: string; role: TipoUsuario; criadoEm: string; ultimoLoginEm: string | null;
}
export interface ColegaCriado { slug: string; nome: string; email: string; conviteUrl: string | null }

export interface FiltrosEquipes {
  q?: string; curso?: string; area?: string; mentor?: string; statusTarefa?: StatusTarefa; ciclo?: string;
  etapa?: number; status?: StatusEquipe;
}

/** GET /notificacoes (RF-18) — a fila de e-mails endereçada à pessoa; o sino (B1) lê daqui. */
export interface Notificacao {
  tipo: string; assunto: string; status: string; dados: Record<string, unknown> | null; criadoEm: string;
}
