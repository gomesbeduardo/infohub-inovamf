import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('token=abc123'),
}));

vi.mock('@/data/api/consultas', () => ({
  useConvite: vi.fn(),
  useAceitarConvite: vi.fn(),
}));

import { useConvite, useAceitarConvite } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import { AceitarConviteForm } from '@/features/auth/AceitarConviteForm';

const refetch = vi.fn();
const mutate = vi.fn();

function mockPreview(estado: Partial<ReturnType<typeof useConvite>>) {
  vi.mocked(useConvite).mockReturnValue({
    isPending: false,
    isError: false,
    data: undefined,
    error: null,
    refetch,
    ...estado,
  } as ReturnType<typeof useConvite>);
}

function mockAceitar(estado: Partial<ReturnType<typeof useAceitarConvite>> = {}) {
  vi.mocked(useAceitarConvite).mockReturnValue({
    mutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
    error: null,
    ...estado,
  } as ReturnType<typeof useAceitarConvite>);
}

describe('AceitarConviteForm (/convite)', () => {
  beforeEach(() => {
    push.mockClear();
    refetch.mockClear();
    mutate.mockClear();
    mockAceitar();
  });

  it('carregando mostra "Carregando…"', () => {
    mockPreview({ isPending: true });
    render(<AceitarConviteForm />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('INVITE_USED mostra a mensagem e o link para entrar', () => {
    mockPreview({
      isPending: false,
      isError: true,
      error: new ApiError(400, 'INVITE_USED', 'x'),
    });
    render(<AceitarConviteForm />);
    expect(
      screen.getByText(/este convite já foi usado — entre com sua senha/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /entrar/i })).toHaveAttribute('href', '/login');
  });

  it('INVITE_EXPIRED mostra a mensagem de convite expirado', () => {
    mockPreview({
      isPending: false,
      isError: true,
      error: new ApiError(400, 'INVITE_EXPIRED', 'x'),
    });
    render(<AceitarConviteForm />);
    expect(
      screen.getByText(/convite expirado — peça um novo link ao líder ou ao mentor/i),
    ).toBeInTheDocument();
  });

  it('INVALID_INVITE mostra "Convite inválido."', () => {
    mockPreview({
      isPending: false,
      isError: true,
      error: new ApiError(400, 'INVALID_INVITE', 'x'),
    });
    render(<AceitarConviteForm />);
    expect(screen.getByText(/^convite inválido\.$/i)).toBeInTheDocument();
  });

  it('role aluno mostra curso, semestre e matrícula; role mentor não mostra', () => {
    mockPreview({
      data: { nome: 'Ana', email: 'ana@teste.dev', telefone: '', role: 'aluno' },
    });
    const { unmount } = render(<AceitarConviteForm />);
    expect(screen.getByLabelText('Curso')).toBeInTheDocument();
    expect(screen.getByLabelText(/semestre\/módulo/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Matrícula')).toBeInTheDocument();
    unmount();

    mockPreview({
      data: { nome: 'Marcos', email: 'marcos@teste.dev', telefone: '', role: 'mentor' },
    });
    render(<AceitarConviteForm />);
    expect(screen.queryByLabelText('Curso')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/semestre\/módulo/i)).not.toBeInTheDocument();
  });

  it('envia o corpo exato do aceite (role aluno) e navega para a home do papel', async () => {
    mockPreview({
      data: { nome: 'Ana', email: 'ana@teste.dev', telefone: '', role: 'aluno' },
    });
    mutate.mockImplementation((_body, opts) => opts?.onSuccess?.({} as never));

    const user = userEvent.setup();
    render(<AceitarConviteForm />);

    await user.type(screen.getByLabelText('Senha'), '12345678');
    await user.type(screen.getByLabelText('Confirmar senha'), '12345678');
    await user.type(screen.getByLabelText('Telefone'), '(55) 90000-2222');
    await user.selectOptions(screen.getByLabelText('Curso'), 'Sistemas de Informação');
    await user.selectOptions(screen.getByLabelText(/semestre\/módulo/i), '3');

    await user.click(screen.getByRole('button', { name: /concluir cadastro/i }));

    expect(mutate).toHaveBeenCalledWith(
      {
        token: 'abc123',
        senha: '12345678',
        telefone: '(55) 90000-2222',
        curso: 'Sistemas de Informação',
        semestre: '3',
        matricula: undefined,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(push).toHaveBeenCalledWith('/aluno');
  });

  it('senhas diferentes bloqueiam o envio', async () => {
    mockPreview({
      data: { nome: 'Marcos', email: 'marcos@teste.dev', telefone: '', role: 'mentor' },
    });
    const user = userEvent.setup();
    render(<AceitarConviteForm />);

    await user.type(screen.getByLabelText('Senha'), '12345678');
    await user.type(screen.getByLabelText('Confirmar senha'), 'diferente');
    await user.type(screen.getByLabelText('Telefone'), '(55) 90000-3333');
    await user.click(screen.getByRole('button', { name: /concluir cadastro/i }));

    expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
