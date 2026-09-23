import type { EquipeResumo, UsuarioAdmin } from '@/data/api/tipos';

export interface ResultadoBusca {
  chave: string;
  titulo: string;
  subtitulo: string;
  href: string;
}

export const LIMITE_RESULTADOS = 8;

/** Sem acento e minúsculo: "SaúdeJá" casa com "saude". */
export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * B4: filtra o que as listas do papel já trouxeram (o escopo é do backend).
 * Equipes pelo nome da ideia; para o admin, também contas (admin, mentor e
 * aluno, como em Contas) por nome ou e-mail.
 */
export function filtrarResultados(p: {
  termo: string;
  papel: 'admin' | 'mentor';
  equipes: EquipeResumo[];
  pessoas: UsuarioAdmin[];
}): ResultadoBusca[] {
  const t = normalizar(p.termo.trim());
  if (!t) return [];
  const base = p.papel === 'admin' ? '/admin/equipes' : '/orientador/equipes';
  const equipes = p.equipes
    .filter((e) => normalizar(e.nomeIdeia).includes(t))
    .map((e) => ({
      chave: `equipe-${e.slug}`,
      titulo: e.nomeIdeia,
      subtitulo: `Equipe · Etapa ${e.etapa.numero}`,
      href: `${base}/${e.slug}`,
    }));
  const pessoas =
    p.papel !== 'admin'
      ? []
      : p.pessoas
          .filter((u) => normalizar(u.nome).includes(t) || normalizar(u.email).includes(t))
          .map((u) => ({
            chave: `pessoa-${u.slug}`,
            titulo: u.nome,
            subtitulo: u.email,
            href: `/admin/contas#conta-${u.slug}`,
          }));
  return [...equipes, ...pessoas].slice(0, LIMITE_RESULTADOS);
}
