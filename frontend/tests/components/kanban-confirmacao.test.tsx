import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

import { StoreProvider } from '@/data/store';
import { FunilBoard } from '@/features/funil/FunilBoard';

const PREF_KEY = 'infohub-kanban-confirmar';

/** dataTransfer mínimo que o handler de arraste usa. */
function dtMock() {
  return { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '' };
}

/** Arrasta o card de `nomeEquipe` para a coluna de índice `destino` (0-based). */
function arrastar(nomeEquipe: string, destino: number) {
  const card = screen.getByText(nomeEquipe).closest('[data-testid="equipe-card"]')!;
  const colunas = screen.getAllByTestId('coluna-funil');
  const dt = dtMock();
  fireEvent.dragStart(card, { dataTransfer: dt });
  fireEvent.drop(colunas[destino], { dataTransfer: dt });
}

function renderBoard() {
  return render(
    <StoreProvider>
      <FunilBoard modo="admin" />
    </StoreProvider>,
  );
}

beforeEach(() => {
  // rAF síncrono: o dragStart adia o set de "arrastando" para o próximo frame
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('FunilBoard — confirmação de arraste', () => {
  it('todo arraste que muda de etapa abre o modal de confirmação', async () => {
    renderBoard();
    arrastar('AgroSmart', 1); // eq-1 (etapa 1) → coluna da etapa 2
    await waitFor(() =>
      expect(screen.getByTestId('confirmar-movimento')).toBeInTheDocument(),
    );
    // movimento normal (não forçado) → botão "Mover" (e não "Mover mesmo assim")
    expect(screen.getByTestId('confirmar-movimento')).toHaveTextContent(/^Mover$/);
  });

  it('cancelar não move a equipe', async () => {
    const user = userEvent.setup();
    renderBoard();
    // EcoAula começa na coluna 0 (etapa 1)
    expect(screen.getAllByTestId('coluna-funil')[0]).toHaveTextContent('EcoAula');
    arrastar('EcoAula', 1);
    await waitFor(() =>
      expect(screen.getByTestId('cancelar-movimento')).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId('cancelar-movimento'));
    const colunas = screen.getAllByTestId('coluna-funil');
    expect(colunas[0]).toHaveTextContent('EcoAula');
    expect(colunas[1]).not.toHaveTextContent('EcoAula');
  });

  it('"não mostrar novamente" persiste a preferência e silencia o modal', async () => {
    const user = userEvent.setup();
    renderBoard();
    arrastar('AgroSmart', 1);
    await waitFor(() =>
      expect(screen.getByTestId('nao-mostrar-novamente')).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId('nao-mostrar-novamente'));
    await user.click(screen.getByTestId('confirmar-movimento'));

    expect(localStorage.getItem(PREF_KEY)).toBe('silenciado');

    // próximo arraste não abre modal — aparece o aviso de "Desfazer"
    arrastar('AgroSmart', 3);
    await waitFor(() =>
      expect(screen.getByTestId('toast-desfazer')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('confirmar-movimento')).not.toBeInTheDocument();
  });

  it('silenciado: "Desfazer" restaura a etapa anterior', async () => {
    const user = userEvent.setup();
    localStorage.setItem(PREF_KEY, 'silenciado');
    renderBoard();

    // EcoAula começa na coluna 0 (etapa 1)
    let colunas = screen.getAllByTestId('coluna-funil');
    expect(colunas[0]).toHaveTextContent('EcoAula');

    arrastar('EcoAula', 1); // move p/ etapa 2, sem modal
    await waitFor(() =>
      expect(screen.getByTestId('desfazer-movimento')).toBeInTheDocument(),
    );
    colunas = screen.getAllByTestId('coluna-funil');
    expect(colunas[1]).toHaveTextContent('EcoAula');

    await user.click(screen.getByTestId('desfazer-movimento'));

    colunas = screen.getAllByTestId('coluna-funil');
    expect(colunas[0]).toHaveTextContent('EcoAula');
    expect(colunas[1]).not.toHaveTextContent('EcoAula');
  });
});
