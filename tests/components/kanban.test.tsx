import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

import { StoreProvider } from '@/data/store';
import { setUsuarioAtual, logout } from '@/data/session';
import { FunilKanban } from '@/features/orientador/FunilKanban';

function renderKanban() {
  return render(
    <StoreProvider>
      <FunilKanban />
    </StoreProvider>,
  );
}

beforeEach(() => {
  logout();
});

describe('FunilKanban (mentor)', () => {
  it('mostra as colunas do funil e a barra de filtros', () => {
    setUsuarioAtual({ id: 'u-mentor-1' });
    renderKanban();
    expect(screen.getAllByTestId('coluna-kanban')).toHaveLength(7);
    expect(screen.getByLabelText('Buscar equipes')).toBeInTheDocument();
  });

  it('não mostra o filtro de mentor (mentor só vê as próprias equipes)', () => {
    setUsuarioAtual({ id: 'u-mentor-1' });
    renderKanban();
    expect(screen.queryByLabelText('Filtrar por mentor')).not.toBeInTheDocument();
  });

  it('a busca filtra os cards do mentor', async () => {
    const user = userEvent.setup();
    setUsuarioAtual({ id: 'u-mentor-1' });
    renderKanban();
    expect(screen.getAllByTestId('equipe-card').length).toBeGreaterThan(1);
    await user.type(screen.getByLabelText('Buscar equipes'), 'ecoaula');
    const cards = screen.getAllByTestId('equipe-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('EcoAula');
  });
});
