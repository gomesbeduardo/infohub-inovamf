import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { StoreProvider, useStore } from '@/data/store';
import { MinhasTarefas } from '@/features/aluno-tarefas/MinhasTarefas';
import { EnviarEntregaDialog } from '@/features/aluno-tarefas/EnviarEntregaDialog';
import { seed } from '@/data/fixtures';
import { setUsuarioAtual } from '@/data/session';

function renderAluno() {
  return render(
    <StoreProvider>
      <MinhasTarefas />
    </StoreProvider>,
  );
}

describe('MinhasTarefas + EnviarEntregaDialog', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setUsuarioAtual({ id: 'u-aluno-3' }); // Carla, líder da AgroSmart (eq-3)
  });

  it('lista as tarefas da equipe do aluno', () => {
    renderAluno();
    expect(screen.getByText('Definir problema e público-alvo')).toBeInTheDocument();
  });

  it('envia entrega por link e a tarefa passa a entregue', async () => {
    const user = userEvent.setup();
    renderAluno();

    await user.click(
      screen.getAllByRole('button', { name: /enviar entrega/i })[0],
    );
    await user.click(screen.getByRole('button', { name: /^link$/i }));
    await user.type(
      screen.getByLabelText(/url do link/i),
      'https://drive.example.com/meu-doc',
    );
    await user.type(
      screen.getByLabelText(/comentário/i),
      'Segue o material solicitado',
    );
    await user.click(screen.getByRole('button', { name: /^enviar$/i }));

    expect(screen.getByText('Entregue')).toBeInTheDocument();
  });

  it('permite enviar múltiplos links numa mesma entrega (RF-14)', async () => {
    const user = userEvent.setup();
    const t2 = seed().tarefas.find((t) => t.id === 't-2')!;

    function Probe() {
      const { state } = useStore();
      const ent = state.entregas.filter((e) => e.tarefaId === 't-2').at(-1);
      return <span data-testid="n-arquivos">{ent ? ent.arquivos.length : 0}</span>;
    }

    render(
      <StoreProvider>
        <EnviarEntregaDialog tarefa={t2} enviadoPor="u-aluno-3" />
        <Probe />
      </StoreProvider>,
    );

    await user.click(screen.getByRole('button', { name: /enviar entrega/i }));
    await user.click(screen.getByRole('button', { name: /^link$/i }));
    await user.type(screen.getByLabelText(/url do link/i), 'https://ex.com/1');
    await user.click(screen.getByRole('button', { name: /adicionar/i }));
    await user.type(screen.getByLabelText(/url do link/i), 'https://ex.com/2');
    await user.click(screen.getByRole('button', { name: /^enviar$/i }));

    expect(screen.getByTestId('n-arquivos').textContent).toBe('2');
  });
});
