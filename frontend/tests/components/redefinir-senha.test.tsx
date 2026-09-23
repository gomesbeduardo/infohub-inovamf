import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const nav = vi.hoisted(() => ({ busca: 'token=abc.def' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.busca),
}));
vi.mock('@/data/api/consultas', () => ({ useRedefinirSenha: vi.fn() }));

import { useRedefinirSenha } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import { RedefinirSenhaForm } from '@/features/auth/RedefinirSenhaForm';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;
const mutate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  nav.busca = 'token=abc.def';
  vi.mocked(useRedefinirSenha).mockReturnValue({ mutate, isPending: false } as unknown as R<
    typeof useRedefinirSenha
  >);
});

async function preencher(senha: string, confirma: string) {
  const user = userEvent.setup();
  render(<RedefinirSenhaForm />);
  await user.type(screen.getByLabelText('Nova senha'), senha);
  await user.type(screen.getByLabelText('Confirmar nova senha'), confirma);
  await user.click(screen.getByRole('button', { name: /salvar nova senha/i }));
}

describe('RedefinirSenhaForm (A3)', () => {
  it('sem ?token avisa que o link é inválido', () => {
    nav.busca = '';
    render(<RedefinirSenhaForm />);
    expect(screen.getByRole('alert')).toHaveTextContent('Link de redefinição inválido ou incompleto.');
  });

  it('usa PasswordInput na senha nova e na confirmação', () => {
    render(<RedefinirSenhaForm />);
    expect(screen.getAllByLabelText(/mostrar senha enquanto pressionado/i)).toHaveLength(2);
  });

  it('bloqueia senha com menos de 8 caracteres e confirmação diferente', async () => {
    await preencher('curta', 'outra');
    expect(screen.getByText('A senha deve ter ao menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('envia { token, senha } e mostra o sucesso com o caminho para entrar', async () => {
    mutate.mockImplementationOnce((_b: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    await preencher('novaSenha123', 'novaSenha123');
    expect(mutate).toHaveBeenCalledWith({ token: 'abc.def', senha: 'novaSenha123' }, expect.anything());
    expect(screen.getByText(/senha redefinida/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^entrar$/i })).toHaveAttribute('href', '/login');
  });

  it('erro da API aparece inline com a mensagem dela', async () => {
    mutate.mockImplementationOnce((_b: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(new ApiError(400, 'RESET_USED', 'Este link já foi usado')),
    );
    await preencher('novaSenha123', 'novaSenha123');
    expect(screen.getByRole('alert')).toHaveTextContent('Este link já foi usado');
  });
});
