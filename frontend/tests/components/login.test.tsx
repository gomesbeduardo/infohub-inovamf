import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

import { LoginForm } from '@/features/auth/LoginForm';
import { sessao } from '@/data/api/sessao';
import { ApiError } from '@/data/api/erro';

describe('LoginForm (API real)', () => {
  beforeEach(() => {
    push.mockClear();
    vi.restoreAllMocks();
  });

  it('401 mostra "Credenciais inválidas"', async () => {
    vi.spyOn(sessao, 'entrar').mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'x'));
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'x@y.dev');
    await user.type(screen.getByLabelText('Senha'), 'errada123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText(/credenciais inválidas/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('sucesso redireciona pela role', async () => {
    vi.spyOn(sessao, 'entrar').mockResolvedValue({ slug: 's', nome: 'M', role: 'mentor' });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'mentor1@demo.infohub.dev');
    await user.type(screen.getByLabelText('Senha'), 'mentor123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(push).toHaveBeenCalledWith('/orientador');
  });

  it('não existe mais atalho de conta de demonstração', () => {
    render(<LoginForm />);
    expect(screen.queryByLabelText(/conta de demonstração/i)).not.toBeInTheDocument();
  });
});
