import type { Notificacao } from '@/data/api/tipos';
import type { Papel } from '@/data/api/sessao';

/**
 * "Lida/não lida" do sino (B1) NÃO vai ao banco: guardamos, por usuário, o
 * instante da última abertura do painel. Tudo mais novo que isso é "novo".
 */
export const chaveVisto = (slug: string) => `infohub-notif-vista:${slug}`;

export function lerVisto(slug: string): string | null {
  try {
    return localStorage.getItem(chaveVisto(slug));
  } catch {
    return null;
  }
}

export function gravarVisto(slug: string, iso: string): void {
  try {
    localStorage.setItem(chaveVisto(slug), iso);
  } catch {
    /* storage indisponível: o contador só não persiste entre recargas */
  }
}

export function contarNaoLidas(itens: Notificacao[], vistoEm: string | null): number {
  const limite = vistoEm ? Date.parse(vistoEm) : Number.NaN;
  if (Number.isNaN(limite)) return itens.length;
  return itens.filter((n) => Date.parse(n.criadoEm) > limite).length;
}

/** "agora", "há 5 min", "há 2 h", "há 1 dia", "há 3 dias". */
export function tempoRelativo(iso: string, agora: Date = new Date()): string {
  const min = Math.max(0, Math.floor((agora.getTime() - Date.parse(iso)) / 60_000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}

const TIPOS_DE_TAREFA = ['nova_tarefa', 'entrega_aprovada', 'entrega_ajustar', 'prazo_proximo', 'prazo_vencido'];

/**
 * Para onde o item do sino leva: aluno → tarefas ou equipe; admin/mentor →
 * detalhe da equipe. `recuperacao_senha` é um pedido de redefinição de senha
 * que só o admin recebe — leva à listagem de contas (RF-18, escopo aprovado).
 */
export function destinoNotificacao(n: Notificacao, papel: Papel): string {
  if (n.tipo === 'recuperacao_senha' && papel === 'admin') return '/admin/contas';
  if (papel === 'aluno') return TIPOS_DE_TAREFA.includes(n.tipo) ? '/aluno/tarefas' : '/aluno';
  const equipe = typeof n.dados?.equipe_slug === 'string' ? n.dados.equipe_slug : null;
  if (papel === 'mentor') return equipe ? `/orientador/equipes/${equipe}` : '/orientador';
  return equipe ? `/admin/equipes/${equipe}` : '/admin';
}

/** Texto curto de apoio: a tarefa, a equipe, o título ou a mensagem, nessa ordem. */
export function detalheNotificacao(n: Notificacao): string | null {
  for (const chave of ['tarefa', 'equipe', 'titulo', 'mensagem']) {
    const v = n.dados?.[chave];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}
