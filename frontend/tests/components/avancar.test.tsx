import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { StoreProvider } from '@/data/store';
import { DetalheEquipe } from '@/features/admin-detalhe/DetalheEquipe';

function renderDetalhe() {
  // eq-3 (AgroSmart) está na etapa 3 e tem a obrigatória t-1 pendente
  return render(
    <StoreProvider>
      <DetalheEquipe slug="agrosmart" />
    </StoreProvider>,
  );
}

describe('AvancarEtapa (RN-01)', () => {
  it('exige forçar quando há obrigatória pendente e só então avança', async () => {
    const user = userEvent.setup();
    renderDetalhe();

    // começa na etapa 3
    expect(screen.getByText(/Encontro 1/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /avançar etapa/i }));

    // aviso da RN-01 aparece
    expect(screen.getByText(/obrigat/i)).toBeInTheDocument();

    // confirmar sem forçar não avança (botão desabilitado)
    const confirmar = screen.getByRole('button', { name: /confirmar/i });
    expect(confirmar).toBeDisabled();
    expect(screen.getByText(/Encontro 1/)).toBeInTheDocument();

    // marca forçar e confirma
    await user.click(screen.getByLabelText(/forçar/i));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    // avançou para a etapa 4
    expect(screen.getByText(/Encontro 2/)).toBeInTheDocument();
  });
});
