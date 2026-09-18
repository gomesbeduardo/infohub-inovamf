import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { StoreProvider } from '@/data/store';
import { seed } from '@/data/fixtures';
import { filtrarEquipes } from '@/data/repository';
import { Funil } from '@/features/admin-funil/Funil';

function renderFunil() {
  return render(
    <StoreProvider>
      <Funil />
    </StoreProvider>,
  );
}

beforeEach(() => {
  nav.search = '';
});

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

  it('permite re-selecionar "Todas as áreas" para limpar o filtro', async () => {
    const user = userEvent.setup();
    renderFunil();
    const total = screen.getAllByTestId('equipe-card').length;
    const areaSelect = screen.getByLabelText('Filtrar por área');

    await user.selectOptions(areaSelect, '2'); // Saúde
    expect(screen.getAllByTestId('equipe-card').length).toBeLessThan(total);

    await user.selectOptions(areaSelect, ''); // Todas as áreas (selecionável)
    expect(screen.getAllByTestId('equipe-card').length).toBe(total);
  });

  it('aplica o filtro vindo da URL (?status=atrasada) — deep-link do dashboard', () => {
    nav.search = 'status=atrasada';
    const esperado = filtrarEquipes(seed(), { statusTarefa: 'atrasada' }).length;
    renderFunil();
    const cards = screen.getAllByTestId('equipe-card');
    expect(esperado).toBeGreaterThan(0);
    expect(cards).toHaveLength(esperado);
  });
});
