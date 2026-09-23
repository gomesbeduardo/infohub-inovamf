import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
}));

import { PerfilMenu } from '@/features/shell/PerfilMenu';

const USUARIO = { slug: 'ana', nome: 'Ana Admin', role: 'admin' as const };

describe('PerfilMenu', () => {
  it('abre com os dois itens e navega para o perfil', async () => {
    const onSair = vi.fn();
    const user = userEvent.setup();
    render(<PerfilMenu usuario={USUARIO} onSair={onSair} />);

    const botao = screen.getByRole('button', { name: /menu de ana admin/i });
    expect(botao).toHaveAttribute('aria-haspopup', 'menu');
    expect(botao).toHaveAttribute('aria-expanded', 'false');

    await user.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');

    const menu = screen.getByRole('menu');
    const itens = screen.getAllByRole('menuitem');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent('Ir para o perfil');
    expect(itens[0]).toHaveAttribute('href', '/conta');
    expect(itens[1]).toHaveTextContent('Sair');
    expect(menu).toBeInTheDocument();
  });

  it('"Sair" chama onSair e fecha o menu', async () => {
    const onSair = vi.fn();
    const user = userEvent.setup();
    render(<PerfilMenu usuario={USUARIO} onSair={onSair} />);

    await user.click(screen.getByRole('button', { name: /menu de ana admin/i }));
    await user.click(screen.getByRole('menuitem', { name: /sair/i }));

    expect(onSair).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('Esc fecha o menu e devolve o foco ao botão', async () => {
    const onSair = vi.fn();
    const user = userEvent.setup();
    render(<PerfilMenu usuario={USUARIO} onSair={onSair} />);

    const botao = screen.getByRole('button', { name: /menu de ana admin/i });
    await user.click(botao);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(botao).toHaveFocus();
  });

  it('no celular mostra só o ícone (nome fica escondido)', async () => {
    const onSair = vi.fn();
    render(<PerfilMenu usuario={USUARIO} onSair={onSair} />);
    const nome = screen.getByText('Ana Admin');
    expect(nome.className).toContain('hidden');
  });
});
