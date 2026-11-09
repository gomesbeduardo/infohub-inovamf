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

  describe('Acesso rápido', () => {
    it.each([
      ['Admin', 'admin@infohub.dev', 'admin123', 'admin', '/admin'],
      ['Mentor', 'mentor1@demo.infohub.dev', 'mentor123', 'mentor', '/orientador'],
      ['Aluno', 'bruna.lopes@demo.infohub.dev', 'aluno123', 'aluno', '/aluno'],
    ] as const)('botão %s entra pelo login real e vai para a home do papel', async (nome, email, senha, role, home) => {
      const entrar = vi
        .spyOn(sessao, 'entrar')
        .mockResolvedValue({ slug: 's', nome: 'N', role } as never);
      const user = userEvent.setup();
      render(<LoginForm />);
      await user.click(screen.getByRole('button', { name: nome }));
      expect(entrar).toHaveBeenCalledWith(email, senha);
      expect(push).toHaveBeenCalledWith(home);
    });

    it('erro no acesso rápido mostra o alerta e não redireciona', async () => {
      vi.spyOn(sessao, 'entrar').mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'x'));
      const user = userEvent.setup();
      render(<LoginForm />);
      await user.click(screen.getByRole('button', { name: 'Admin' }));
      expect(await screen.findByText(/credenciais inválidas/i)).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });
  });
});
