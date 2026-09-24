import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/data/api/consultas', () => ({
  useGerarConvite: vi.fn(),
  useRemoverMembro: vi.fn(),
}));

import { useGerarConvite, useRemoverMembro } from '@/data/api/consultas';
import type { Membro } from '@/data/api/tipos';
import { MembrosLista } from '@/features/equipe/MembrosLista';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const MEMBROS: Membro[] = [
  { slug: 'lia', nome: 'Lia Líder', papel: 'lider', tipo: 'aluno', pendente: false, curso: 'Direito', semestre: '3' },
  { slug: 'caio', nome: 'Caio Integrante', papel: 'integrante', tipo: 'aluno', pendente: false, curso: 'Agronomia', semestre: '5' },
];

const gerar = vi.fn();
const remover = vi.fn();

function mockPadrao() {
  vi.mocked(useGerarConvite).mockReturnValue({ mutate: gerar, isPending: false } as unknown as R<typeof useGerarConvite>);
  vi.mocked(useRemoverMembro).mockReturnValue({ mutate: remover, isPending: false } as unknown as R<typeof useRemoverMembro>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPadrao();
});

describe('MembrosLista — retirar integrante', () => {
  it('botão "Retirar" aparece para integrante e não para o líder, quando podeGerir', () => {
    render(<MembrosLista equipeSlug="agrosmart" membros={MEMBROS} podeGerir />);

    const lider = screen.getByTestId('membro-lia');
    expect(within(lider).queryByRole('button', { name: 'Retirar' })).not.toBeInTheDocument();

    const caio = screen.getByTestId('membro-caio');
    expect(within(caio).getByRole('button', { name: 'Retirar' })).toBeInTheDocument();
  });

  it('não aparece com podeGerir=false', () => {
    render(<MembrosLista equipeSlug="agrosmart" membros={MEMBROS} podeGerir={false} />);
    expect(screen.queryByRole('button', { name: 'Retirar' })).not.toBeInTheDocument();
  });

  it('confirmar no diálogo chama useRemoverMembro().mutate(slug)', async () => {
    const user = userEvent.setup();
    render(<MembrosLista equipeSlug="agrosmart" membros={MEMBROS} podeGerir />);

    const caio = screen.getByTestId('membro-caio');
    await user.click(within(caio).getByRole('button', { name: 'Retirar' }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByRole('heading', { name: 'Retirar integrante' })).toBeInTheDocument();
    expect(within(dialogo).getByText(/Retirar Caio Integrante da equipe\?/)).toBeInTheDocument();

    await user.click(within(dialogo).getByRole('button', { name: 'Retirar' }));

    expect(remover).toHaveBeenCalledWith('caio', expect.anything());
  });

  it('cancelar no diálogo não chama a mutation', async () => {
    const user = userEvent.setup();
    render(<MembrosLista equipeSlug="agrosmart" membros={MEMBROS} podeGerir />);

    const caio = screen.getByTestId('membro-caio');
    await user.click(within(caio).getByRole('button', { name: 'Retirar' }));

    const dialogo = screen.getByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(remover).not.toHaveBeenCalled();
  });
});
