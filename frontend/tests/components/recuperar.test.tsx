import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/data/api/consultas', () => ({ usePedirRedefinicao: vi.fn() }));

import { usePedirRedefinicao } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import { RecuperarSenhaForm } from '@/features/auth/RecuperarSenhaForm';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;
const mutate = vi.fn();
const GENERICA = 'Pedido recebido. Se houver uma conta ativa com esse e-mail, a coordenação já foi avisada.';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePedirRedefinicao).mockReturnValue({ mutate, isPending: false } as unknown as R<
    typeof usePedirRedefinicao
  >);
});

describe('RecuperarSenhaForm (adendo 23/09)', () => {
  it('explica o caminho e tem link de volta ao login', () => {
    render(<RecuperarSenhaForm />);
    expect(screen.getByText(/a coordenação vai te enviar um link/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar ao login/i })).toHaveAttribute('href', '/login');
  });

  it('sem e-mail não envia', async () => {
    const user = userEvent.setup();
    render(<RecuperarSenhaForm />);
    await user.click(screen.getByRole('button', { name: 'Pedir redefinição' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe seu e-mail.');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('envia o e-mail e mostra a confirmação genérica da API, mantendo a orientação', async () => {
    mutate.mockImplementationOnce((_e: unknown, opts?: { onSuccess?: (r: { mensagem: string }) => void }) =>
      opts?.onSuccess?.({ mensagem: GENERICA }),
    );
    const user = userEvent.setup();
    render(<RecuperarSenhaForm />);
    await user.type(screen.getByLabelText('E-mail'), 'lia@amf.edu.br');
    await user.click(screen.getByRole('button', { name: 'Pedir redefinição' }));
    expect(mutate).toHaveBeenCalledWith('lia@amf.edu.br', expect.anything());
    expect(screen.getByRole('status')).toHaveTextContent(GENERICA);
    expect(screen.queryByRole('button', { name: 'Pedir redefinição' })).not.toBeInTheDocument();
    expect(screen.getByText(/a coordenação vai te enviar um link/i)).toBeInTheDocument();
  });

  it('erro da API (ex.: muitas tentativas) aparece inline', async () => {
    mutate.mockImplementationOnce((_e: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(new ApiError(429, 'RATE_LIMITED', 'Muitas tentativas. Tente novamente mais tarde.')),
    );
    const user = userEvent.setup();
    render(<RecuperarSenhaForm />);
    await user.type(screen.getByLabelText('E-mail'), 'lia@amf.edu.br');
    await user.click(screen.getByRole('button', { name: 'Pedir redefinição' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Muitas tentativas');
  });
});
