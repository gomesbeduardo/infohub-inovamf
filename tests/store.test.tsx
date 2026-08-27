import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreProvider, useStore, useActions } from '@/data/store';

function Harness() {
  const { state } = useStore();
  const actions = useActions();
  const eq = state.equipes.find((e) => e.id === 'eq-1')!;
  return (
    <div>
      <span data-testid="etapa">{eq.etapaAtualId}</span>
      <button
        onClick={() =>
          actions.avancar('eq-1', { forcar: true, autorId: 'u-mentor-1' })
        }
      >
        avancar
      </button>
    </div>
  );
}

describe('store', () => {
  it('useActions().avancar reflete a mudança no useStore().state', async () => {
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <Harness />
      </StoreProvider>,
    );

    expect(screen.getByTestId('etapa').textContent).toBe('1');
    await user.click(screen.getByText('avancar'));
    expect(screen.getByTestId('etapa').textContent).toBe('2');
  });

  it('useActions().login autentica contra o estado do store', async () => {
    let resultado: string | null = null;
    function LoginHarness() {
      const actions = useActions();
      return (
        <button
          onClick={() => {
            resultado = actions.login('admin@infohub.dev', '123456')?.tipo ?? null;
          }}
        >
          login
        </button>
      );
    }
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <LoginHarness />
      </StoreProvider>,
    );
    await user.click(screen.getByText('login'));
    expect(resultado).toBe('admin');
  });
});
