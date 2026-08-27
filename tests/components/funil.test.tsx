import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

import { vi } from 'vitest';
import { StoreProvider } from '@/data/store';
import { Funil } from '@/features/admin-funil/Funil';

function renderFunil() {
  return render(
    <StoreProvider>
      <Funil />
    </StoreProvider>,
  );
}

describe('Funil', () => {
  it('mostra 7 colunas (6 etapas + pronta p/ InovAMF)', () => {
    renderFunil();
    expect(screen.getAllByTestId('coluna-funil')).toHaveLength(7);
  });

  it('cada card mostra o nome da ideia e a badge de área', () => {
    renderFunil();
    const card = screen.getByText('AgroSmart').closest('[data-testid="equipe-card"]')!;
    expect(card).toBeTruthy();
    expect(card).toHaveTextContent('Tecnologia');
  });

  it('a busca filtra os cards exibidos', async () => {
    const user = userEvent.setup();
    renderFunil();
    expect(screen.getAllByTestId('equipe-card').length).toBeGreaterThan(1);
    await user.type(screen.getByLabelText('Buscar equipes'), 'agro');
    const cards = screen.getAllByTestId('equipe-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('AgroSmart');
  });
});
