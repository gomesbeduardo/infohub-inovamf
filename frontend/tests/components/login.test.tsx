import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/credenciais inválidas/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('sucesso redireciona pela role', async () => {
    vi.spyOn(sessao, 'entrar').mockResolvedValue({ slug: 's', nome: 'M', role: 'mentor' });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'mentor1@demo.infohub.dev');
    await user.type(screen.getByLabelText('Senha'), 'mentor123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(push).toHaveBeenCalledWith('/orientador');
  });

  it('mostra o grupo "Acesso rápido" com um botão por papel, rotulado para leitor de tela', () => {
    render(<LoginForm />);
    const grupo = screen.getByRole('group', { name: /acesso rápido/i });
    expect(within(grupo).getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Entrar como Admin' })).toHaveTextContent('Admin');
    expect(screen.getByRole('button', { name: 'Entrar como Mentor' })).toHaveTextContent('Mentor');
    expect(screen.getByRole('button', { name: 'Entrar como Aluno' })).toHaveTextContent('Aluno');
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
      await user.click(screen.getByRole('button', { name: `Entrar como ${nome}` }));
      expect(entrar).toHaveBeenCalledWith(email, senha);
      expect(push).toHaveBeenCalledWith(home);
    });

    it('401 no acesso rápido orienta a rodar o seed e não redireciona', async () => {
      vi.spyOn(sessao, 'entrar').mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'x'));
      const user = userEvent.setup();
      render(<LoginForm />);
      await user.click(screen.getByRole('button', { name: 'Entrar como Admin' }));
      expect(
        await screen.findByText('Conta de demonstração não encontrada. Rode o seed com SEED_DEMO=true.'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/credenciais inválidas/i)).not.toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    it('enquanto o login está em andamento, os botões e o envio ficam desabilitados e entrar roda uma vez', async () => {
      const entrar = vi.spyOn(sessao, 'entrar').mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      render(<LoginForm />);
      await user.click(screen.getByRole('button', { name: 'Entrar como Admin' }));
      for (const nome of ['Admin', 'Mentor', 'Aluno']) {
        expect(screen.getByRole('button', { name: `Entrar como ${nome}` })).toBeDisabled();
      }
      expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Entrar como Admin' }));
      expect(entrar).toHaveBeenCalledTimes(1);
    });
  });
});
