import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { StoreProvider } from '@/data/store';
import { ContasAdmin } from '@/features/admin-contas/ContasAdmin';

describe('ContasAdmin', () => {
  it('cria uma nova conta de mentor e ela aparece na lista', async () => {
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <ContasAdmin />
      </StoreProvider>,
    );

    await user.click(screen.getByRole('button', { name: /nova conta/i }));
    await user.type(screen.getByLabelText('Nome'), 'Paulo Mentor');
    await user.type(screen.getByLabelText('E-mail'), 'paulo@infohub.dev');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.type(screen.getByLabelText('Telefone'), '(55) 90000-3333');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(screen.getByText('paulo@infohub.dev')).toBeInTheDocument();
  });

  it('desativa uma conta existente', async () => {
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <ContasAdmin />
      </StoreProvider>,
    );
    const linha = screen.getByText('mentor@infohub.dev').closest('li')!;
    await user.click(
      within(linha).getByRole('button', { name: /desativar/i }),
    );
    expect(within(linha).getByText(/inativa/i)).toBeInTheDocument();
  });
});
