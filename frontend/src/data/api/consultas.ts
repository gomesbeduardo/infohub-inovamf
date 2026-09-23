'use client';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, requisicao } from './http';
import { sessao, type RespostaSessao } from './sessao';
import type {
  Anotacao, Area, Ciclo, ColegaCriado, Dashboard, Entrega, EquipeDetalhe, EquipeResumo, Etapa,
  FiltrosEquipes, ItemLinhaDoTempo, Me, ModeloTarefa, Notificacao, NumerosPublicos, Pagina, Posicao, Tarefa,
  UsuarioAdmin,
} from './tipos';
import type { StatusEquipe } from '@/domain/types';

function qs(f: object): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const chaves = {
  etapas: ['etapas'] as const,
  areas: ['areas'] as const,
  ciclos: ['ciclos'] as const,
  modelos: ['modelos'] as const,
  equipes: (f: FiltrosEquipes = {}) => ['equipes', f] as const,
  equipe: (slug: string) => ['equipe', slug] as const,
  tarefas: (equipeSlug: string) => ['tarefas', equipeSlug] as const,
  entregas: (tarefaSlug: string) => ['entregas', tarefaSlug] as const,
  anotacoes: (equipeSlug: string) => ['anotacoes', equipeSlug] as const,
  linhaDoTempo: (equipeSlug: string) => ['linha-do-tempo', equipeSlug] as const,
  dashboard: ['dashboard'] as const,
  usuarios: (tipo?: string) => ['usuarios', tipo ?? 'todos'] as const,
  convite: (token: string) => ['convite', token] as const,
  me: ['me'] as const,
  publicoNumeros: ['publico', 'numeros'] as const,
  notificacoes: ['notificacoes'] as const,
};

// ── Referência ────────────────────────────────────────────────────────────────
const lista = <T,>(path: string) => () => api<{ data: T[] }>(path).then((r) => r.data);
export const useEtapas = () => useQuery({ queryKey: chaves.etapas, queryFn: lista<Etapa>('/etapas-funil'), staleTime: Infinity });
export const useAreas = () => useQuery({ queryKey: chaves.areas, queryFn: lista<Area>('/areas-ideia'), staleTime: Infinity });
export const useCiclos = () => useQuery({ queryKey: chaves.ciclos, queryFn: lista<Ciclo>('/ciclos'), staleTime: Infinity });
export const useModelos = () => useQuery({ queryKey: chaves.modelos, queryFn: lista<ModeloTarefa>('/modelos-tarefa') });

// ── Equipes ───────────────────────────────────────────────────────────────────
/** Todas as equipes do escopo (percorre as páginas de 100). */
export function useEquipes(filtros: FiltrosEquipes = {}) {
  return useQuery({
    queryKey: chaves.equipes(filtros),
    queryFn: async () => {
      const todas: EquipeResumo[] = [];
      for (let page = 1; ; page++) {
        const r = await api<Pagina<EquipeResumo>>(`/equipes${qs({ ...filtros, page, perPage: 100 })}`);
        todas.push(...r.data);
        if (todas.length >= r.total || r.data.length === 0) return todas;
      }
    },
    // trocar filtro mantém a lista anterior na tela até a nova chegar (sem "piscar")
    placeholderData: keepPreviousData,
  });
}
export const useEquipe = (slug: string) =>
  useQuery({ queryKey: chaves.equipe(slug), queryFn: () => api<EquipeDetalhe>(`/equipes/${slug}`), enabled: !!slug });

/** A5: linha do tempo da equipe (o backend já aplica o escopo do papel). */
export const useLinhaDoTempo = (equipeSlug: string) =>
  useQuery({
    queryKey: chaves.linhaDoTempo(equipeSlug),
    queryFn: () =>
      api<{ data: ItemLinhaDoTempo[] }>(`/equipes/${equipeSlug}/linha-do-tempo`).then((r) => r.data),
    enabled: !!equipeSlug,
  });

/** A1: gestão do admin — mentor e status via PATCH /equipes/:slug (a regra é do backend). */
export function useAtualizarEquipe(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { mentor?: string | null; status?: StatusEquipe }) =>
      api(`/equipes/${slug}`, { method: 'PATCH', body: b }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.equipe(slug) });
      void qc.invalidateQueries({ queryKey: ['equipes'] });
      void qc.invalidateQueries({ queryKey: chaves.linhaDoTempo(slug) });
      void qc.invalidateQueries({ queryKey: chaves.dashboard });
    },
  });
}

/** RF-20: lembrete manual avulso para os integrantes (admin ou mentor da equipe). */
export function useEnviarLembrete(equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { mensagem?: string }) =>
      api<{ enfileirados: number; total: number }>(`/equipes/${equipeSlug}/lembrete`, { method: 'POST', body: b }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chaves.linhaDoTempo(equipeSlug) }),
  });
}

export function useMoverEtapa(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { etapa: Posicao; forcado?: boolean; observacao?: string }) =>
      api(`/equipes/${slug}/etapa`, { method: 'POST', body: b }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['equipes'] });
      void qc.invalidateQueries({ queryKey: chaves.equipe(slug) });
      void qc.invalidateQueries({ queryKey: chaves.dashboard });
      void qc.invalidateQueries({ queryKey: chaves.linhaDoTempo(slug) });
    },
  });
}

export function useInscricao() {
  return useMutation({
    mutationFn: (body: unknown) =>
      api<RespostaSessao & { equipe: { slug: string; nomeIdeia: string }; colegas: ColegaCriado[] }>(
        '/equipes/inscricao',
        { method: 'POST', body, publica: true },
      ),
    onSuccess: (r) => sessao.aplicar(r),
  });
}

export function useAdicionarMembro(equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { nome: string; email: string }) =>
      api<ColegaCriado & { pendente: boolean }>(`/equipes/${equipeSlug}/membros`, { method: 'POST', body: b }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.equipe(equipeSlug) });
      void qc.invalidateQueries({ queryKey: ['equipes'] });
    },
  });
}

export function useGerarConvite(equipeSlug: string) {
  return useMutation({
    mutationFn: (membroSlug: string) =>
      api<{ conviteUrl: string; expiraEm: string }>(`/equipes/${equipeSlug}/membros/${membroSlug}/convite`, { method: 'POST' }),
  });
}

/** RF-23: o backend gera o CSV com os filtros; aqui só baixa. */
export async function baixarCSV(filtros: FiltrosEquipes): Promise<void> {
  const res = await requisicao(`/equipes/export.csv${qs(filtros)}`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equipes-infohub.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Convite ───────────────────────────────────────────────────────────────────
export const useConvite = (token: string) =>
  useQuery({
    queryKey: chaves.convite(token),
    queryFn: () =>
      api<{ nome: string; email: string; telefone: string; role: string }>(
        `/auth/invite?token=${encodeURIComponent(token)}`,
        { publica: true },
      ),
    enabled: !!token,
    retry: false,
  });

export function useAceitarConvite() {
  return useMutation({
    mutationFn: (body: {
      token: string; senha: string; nome?: string; telefone?: string; curso?: string; semestre?: string; matricula?: string;
    }) => api<RespostaSessao>('/auth/register', { method: 'POST', body, publica: true }),
    onSuccess: (r) => sessao.aplicar(r),
  });
}

// ── Tarefas e entregas ────────────────────────────────────────────────────────
export const useTarefas = (equipeSlug: string) =>
  useQuery({
    queryKey: chaves.tarefas(equipeSlug),
    queryFn: () => api<{ data: Tarefa[] }>(`/equipes/${equipeSlug}/tarefas`).then((r) => r.data),
    enabled: !!equipeSlug,
  });

export function useCriarTarefa(equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { modelo: number; dataEntrega?: string } | {
      titulo: string; descricao?: string; etapa: number; dataEntrega: string; obrigatoria: boolean;
    }) => api<Tarefa>(`/equipes/${equipeSlug}/tarefas`, { method: 'POST', body: b }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.tarefas(equipeSlug) });
      void qc.invalidateQueries({ queryKey: chaves.equipe(equipeSlug) });
    },
  });
}

export const useEntregas = (tarefaSlug: string) =>
  useQuery({
    queryKey: chaves.entregas(tarefaSlug),
    queryFn: () => api<{ data: Entrega[] }>(`/tarefas/${tarefaSlug}/entregas`).then((r) => r.data),
    enabled: !!tarefaSlug,
  });

function invalidarTarefa(qc: ReturnType<typeof useQueryClient>, tarefaSlug: string, equipeSlug: string) {
  void qc.invalidateQueries({ queryKey: chaves.entregas(tarefaSlug) });
  void qc.invalidateQueries({ queryKey: chaves.tarefas(equipeSlug) });
  void qc.invalidateQueries({ queryKey: chaves.equipe(equipeSlug) });
  void qc.invalidateQueries({ queryKey: ['equipes'] });
  void qc.invalidateQueries({ queryKey: chaves.dashboard });
  void qc.invalidateQueries({ queryKey: chaves.linhaDoTempo(equipeSlug) });
}

export function useEnviarEntrega(tarefaSlug: string, equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { links: Array<string | { url: string; nome?: string }>; comentario?: string }) =>
      api<Entrega>(`/tarefas/${tarefaSlug}/entregas`, { method: 'POST', body: b }),
    onSuccess: () => invalidarTarefa(qc, tarefaSlug, equipeSlug),
  });
}

export function useAvaliar(tarefaSlug: string, equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { entregaSlug: string; resultado: 'aprovada' | 'ajustar'; comentario?: string }) =>
      api(`/entregas/${b.entregaSlug}/avaliacoes`, { method: 'POST', body: { resultado: b.resultado, comentario: b.comentario } }),
    onSuccess: () => invalidarTarefa(qc, tarefaSlug, equipeSlug),
  });
}

// ── Anotações (RF-10) ─────────────────────────────────────────────────────────
export const useAnotacoes = (equipeSlug: string) =>
  useQuery({
    queryKey: chaves.anotacoes(equipeSlug),
    queryFn: () => api<{ data: Anotacao[] }>(`/equipes/${equipeSlug}/anotacoes`).then((r) => r.data),
    enabled: !!equipeSlug,
  });

export function useAnotar(equipeSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conteudo: string) =>
      api<Anotacao>(`/equipes/${equipeSlug}/anotacoes`, { method: 'POST', body: { conteudo } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chaves.anotacoes(equipeSlug) }),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const useDashboard = () => useQuery({ queryKey: chaves.dashboard, queryFn: () => api<Dashboard>('/dashboard') });

// ── Contas ────────────────────────────────────────────────────────────────────
export const useUsuarios = (tipo?: 'admin' | 'mentor' | 'aluno') =>
  useQuery({
    queryKey: chaves.usuarios(tipo),
    queryFn: () => api<Pagina<UsuarioAdmin>>(`/usuarios${qs({ tipo, perPage: 100 })}`).then((r) => r.data),
  });

// POST /usuarios não devolve ativo/conviteAceito (a conta nasce pendente,
// aceita depois pelo convite) — corpo real, não UsuarioAdmin inteiro.
interface UsuarioCriado {
  slug: string; nome: string; email: string; telefone: string; role: 'admin' | 'mentor'; conviteUrl: string;
}

export function useCriarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { nome: string; email: string; telefone?: string; tipo: 'admin' | 'mentor' }) =>
      api<UsuarioCriado>('/usuarios', { method: 'POST', body: b }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useEditarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, ...b }: { slug: string; nome?: string; telefone?: string; tipo?: 'admin' | 'mentor'; ativo?: boolean }) =>
      api<UsuarioAdmin>(`/usuarios/${slug}`, { method: 'PATCH', body: b }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useReenviarConvite() {
  return useMutation({
    mutationFn: (slug: string) => api<{ conviteUrl: string }>(`/usuarios/${slug}/convite`, { method: 'POST' }),
  });
}

export const useMe = () => useQuery({ queryKey: chaves.me, queryFn: () => api<Me>('/auth/me') });

export function useAtualizarMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { nome?: string; telefone?: string }) => api<Me>('/auth/me', { method: 'PATCH', body: b }),
    onSuccess: (me) => qc.setQueryData(chaves.me, me),
  });
}

export function useTrocarSenha() {
  return useMutation({
    mutationFn: (b: { atual: string; nova: string }) => api<RespostaSessao>('/auth/senha', { method: 'POST', body: b }),
    onSuccess: (r) => sessao.aplicar(r),
  });
}

// ── Notificações (B1) ────────────────────────────────────────────────────────
/** Inbox do sino. Consulta a cada 60 s e quando a janela volta a ter foco. */
export const useNotificacoes = () =>
  useQuery({
    queryKey: chaves.notificacoes,
    queryFn: () => api<Pagina<Notificacao>>('/notificacoes?perPage=20').then((r) => r.data),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

// ── Público (landing) ────────────────────────────────────────────────────────
export const useNumerosPublicos = () =>
  useQuery({
    queryKey: chaves.publicoNumeros,
    queryFn: () => api<{ data: NumerosPublicos }>('/publico/numeros').then((r) => r.data),
    staleTime: 60_000,
  });
