'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import type { UsuarioSessao } from '@/data/api/sessao';
import type { Notificacao } from '@/data/api/tipos';
import { useNotificacoes } from '@/data/api/consultas';
import { Skeleton } from '@/design-system/components/Skeleton';
import {
  AlertIcon,
  BellIcon,
  CalendarIcon,
  CheckIcon,
  LightbulbIcon,
  ListChecksIcon,
  MailIcon,
  UploadIcon,
  UserIcon,
  type IconProps,
} from '@/design-system/icons';
import {
  contarNaoLidas,
  destinoNotificacao,
  detalheNotificacao,
  gravarVisto,
  lerVisto,
  tempoRelativo,
} from '@/features/shell/notificacoes';

const ICONE: Record<string, (p: IconProps) => JSX.Element> = {
  nova_tarefa: ListChecksIcon,
  entrega_aprovada: CheckIcon,
  entrega_ajustar: AlertIcon,
  entrega_recebida_admin: UploadIcon,
  novo_cadastro_admin: LightbulbIcon,
  lembrete_manual: BellIcon,
  prazo_proximo: CalendarIcon,
  prazo_vencido: CalendarIcon,
  tarefa_atrasada_admin: CalendarIcon,
  recuperacao_senha: UserIcon,
};

/**
 * Sino do AppShell (B1), para todos os papéis. Lê GET /notificacoes; o
 * contador compara com a última abertura do painel (localStorage por usuário).
 * Esc ou clique fora fecham o painel.
 */
export function SinoNotificacoes({ usuario }: { usuario: UsuarioSessao }) {
  const consulta = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const [vistoEm, setVistoEm] = useState<string | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const painelId = useId();

  // localStorage só existe no cliente: lê depois de montar.
  useEffect(() => {
    setVistoEm(lerVisto(usuario.slug));
  }, [usuario.slug]);

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      // Fechar pelo teclado devolve o foco ao sino (não some no <body>).
      if (e.key === 'Escape') {
        setAberto(false);
        botao.current?.focus();
      }
    };
    const clique = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('keydown', tecla);
    document.addEventListener('mousedown', clique);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.removeEventListener('mousedown', clique);
    };
  }, [aberto]);

  const itens = consulta.data ?? [];
  const naoLidas = contarNaoLidas(itens, vistoEm);

  function alternar() {
    if (!aberto) {
      const agora = new Date().toISOString();
      gravarVisto(usuario.slug, agora);
      setVistoEm(agora);
    }
    setAberto((a) => !a);
  }

  return (
    <div ref={raiz} className="relative">
      <button
        ref={botao}
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls={painelId}
        aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} ${naoLidas === 1 ? 'nova' : 'novas'}` : 'Notificações'}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
      >
        <BellIcon size={18} />
        {naoLidas > 0 && (
          <span
            aria-hidden="true"
            data-testid="contador-notificacoes"
            className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-primary px-1 text-center text-[0.65rem] font-semibold leading-[1.1rem] text-primary-fg"
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          id={painelId}
          role="region"
          aria-label="Notificações"
          className="absolute right-0 top-11 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-md"
        >
          {consulta.isPending ? (
            <Skeleton linhas={3} className="p-2" />
          ) : consulta.isError ? (
            <p
              role="alert"
              className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
            >
              {consulta.error.message}
            </p>
          ) : itens.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">Nenhuma notificação por enquanto.</p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {itens.map((n, i) => (
                <ItemNotificacao
                  key={`${n.criadoEm}-${i}`}
                  n={n}
                  papel={usuario.role}
                  onAbrir={() => setAberto(false)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ItemNotificacao({
  n,
  papel,
  onAbrir,
}: {
  n: Notificacao;
  papel: UsuarioSessao['role'];
  onAbrir: () => void;
}) {
  const Icone = ICONE[n.tipo] ?? MailIcon;
  const detalhe = detalheNotificacao(n);
  return (
    <li>
      <Link
        href={destinoNotificacao(n, papel)}
        onClick={onAbrir}
        className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
      >
        <Icone size={18} className="mt-0.5 shrink-0 text-primary-text" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-text">{n.assunto}</span>
          {detalhe && <span className="truncate text-xs text-text-muted">{detalhe}</span>}
          <span className="text-xs text-text-subtle">{tempoRelativo(n.criadoEm)}</span>
        </span>
      </Link>
    </li>
  );
}
