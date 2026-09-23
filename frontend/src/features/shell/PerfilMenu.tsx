'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UsuarioSessao } from '@/data/api/sessao';
import { Avatar } from '@/design-system/components/Avatar';
import { LogoutIcon, UserIcon } from '@/design-system/icons';

export interface PerfilMenuProps {
  usuario: UsuarioSessao;
  onSair: () => void;
}

/**
 * Botão de perfil do cabeçalho (Task 17): avatar + nome (só avatar no
 * celular) que abre um dropdown com "Ir para o perfil" e "Sair". Segue o
 * padrão do painel do sino (`SinoNotificacoes`): Esc e clique fora fecham
 * devolvendo o foco ao botão; aqui as setas ↑/↓ também navegam entre os itens.
 */
export function PerfilMenu({ usuario, onSair }: PerfilMenuProps) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const itensRef = useRef<Array<HTMLElement | null>>([]);
  const menuId = useId();
  const pathname = usePathname();

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      // Fechar pelo teclado devolve o foco ao botão (não some no <body>).
      if (e.key === 'Escape') {
        setAberto(false);
        botao.current?.focus();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const itens = itensRef.current.filter((el): el is HTMLElement => el !== null);
        if (itens.length === 0) return;
        e.preventDefault();
        const atual = itens.findIndex((el) => el === document.activeElement);
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const proximo = (atual + delta + itens.length) % itens.length;
        itens[proximo]?.focus();
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

  useEffect(() => {
    if (aberto) itensRef.current[0]?.focus();
  }, [aberto]);

  function sair() {
    setAberto(false);
    onSair();
  }

  return (
    <div ref={raiz} className="relative">
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={menuId}
        aria-label={`Menu de ${usuario.nome}`}
        className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
      >
        <Avatar nome={usuario.nome} className="h-7 w-7" />
        <span className="hidden sm:inline">{usuario.nome}</span>
      </button>

      {aberto && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Menu de ${usuario.nome}`}
          className="absolute right-0 top-11 z-40 flex w-56 flex-col gap-0.5 rounded-xl border border-border bg-surface p-1.5 shadow-md"
        >
          <Link
            ref={(el) => {
              itensRef.current[0] = el;
            }}
            href="/conta"
            role="menuitem"
            aria-current={pathname === '/conta' ? 'page' : undefined}
            onClick={() => setAberto(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
          >
            <UserIcon size={16} />
            Ir para o perfil
          </Link>
          <button
            ref={(el) => {
              itensRef.current[1] = el;
            }}
            type="button"
            role="menuitem"
            onClick={sair}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
          >
            <LogoutIcon size={16} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
