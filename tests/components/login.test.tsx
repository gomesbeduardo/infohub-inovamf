import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

import { StoreProvider } from '@/data/store';
import { LoginForm } from '@/features/auth/LoginForm';
import { getUsuarioIdAtual } from '@/data/session';

function renderLogin() {
  return render(
    <StoreProvider>
      <LoginForm />
    </StoreProvider>,
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockClear();
    sessionStorage.clear();
  });

  it('mostra erro com credenciais inválidas', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('E-mail'), 'x@y.dev');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('loga o admin, grava a sessão e redireciona para /admin', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('E-mail'), 'admin@infohub.dev');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(getUsuarioIdAtual()).toBe('u-admin');
    expect(push).toHaveBeenCalledWith('/admin');
  });

  it('redireciona o aluno para /aluno', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('E-mail'), 'aluno@infohub.dev');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(push).toHaveBeenCalledWith('/aluno');
  });
});
