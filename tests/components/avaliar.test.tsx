import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { StoreProvider } from '@/data/store';
import { seed } from '@/data/fixtures';
import { TarefaList } from '@/features/admin-tarefas/TarefaList';

const eq6 = seed().equipes.find((e) => e.id === 'eq-6')!;

function renderList() {
  return render(
    <StoreProvider>
      <TarefaList equipe={eq6} />
    </StoreProvider>,
  );
}

describe('AvaliarEntrega', () => {
  it('aprovar deixa a tarefa entregue como aprovada', async () => {
    const user = userEvent.setup();
    renderList();
    expect(screen.getByText('Gravar o Pitch Vídeo')).toBeInTheDocument();
    expect(screen.getByText('Entregue')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /aprovar/i }));
    expect(screen.getByText('Aprovada')).toBeInTheDocument();
  });

  it('solicitar ajustes com comentário deixa a tarefa como ajustar', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole('button', { name: /solicitar ajustes/i }));
    await user.type(
      screen.getByLabelText(/coment/i),
      'Refazer o áudio do vídeo',
    );
    await user.click(screen.getByRole('button', { name: /enviar avaliação/i }));

    expect(screen.getByText('Ajustar')).toBeInTheDocument();
  });
});
