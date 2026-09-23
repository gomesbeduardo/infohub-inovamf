import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/data/api/consultas', () => ({ useLinhaDoTempo: vi.fn() }));

import { useLinhaDoTempo } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import type { EquipeDetalhe, ItemLinhaDoTempo } from '@/data/api/tipos';
import { LinhaDoTempo } from '@/features/equipe/LinhaDoTempo';
import { ProximoPasso } from '@/features/aluno-equipe/ProximoPasso';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const ITENS: ItemLinhaDoTempo[] = Array.from(
  { length: 7 },
  (_, i): ItemLinhaDoTempo => ({
    tipo: 'entrega',
    titulo: `Entrega enviada: Tarefa ${i + 1} (v1)`,
    detalhe: i === 0 ? 'Segue o link' : undefined,
    autor: 'Lia Líder',
    em: `2026-09-${String(20 - i).padStart(2, '0')}T12:00:00Z`,
  }),
);
const refetch = vi.fn();

function mockLinha(parcial: Record<string, unknown> = {}) {
  vi.mocked(useLinhaDoTempo).mockReturnValue({
    data: ITENS,
    isPending: false,
    isError: false,
    error: null,
    refetch,
    ...parcial,
  } as unknown as R<typeof useLinhaDoTempo>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLinha();
});

describe('LinhaDoTempo (A5)', () => {
  it('lista os eventos com título, detalhe, autor e data', () => {
    render(<LinhaDoTempo equipeSlug="agro" />);
    expect(useLinhaDoTempo).toHaveBeenCalledWith('agro');
    const itens = within(screen.getByRole('list', { name: 'Linha do tempo' })).getAllByRole('listitem');
    expect(itens).toHaveLength(7);
    expect(itens[0]).toHaveTextContent('Entrega enviada: Tarefa 1 (v1)');
    expect(itens[0]).toHaveTextContent('Segue o link');
    expect(itens[0]).toHaveTextContent('Lia Líder');
    expect(itens[0]).toHaveTextContent('20/09/2026');
  });

  it('a versão resumida mostra só os 5 mais recentes', () => {
    render(<LinhaDoTempo equipeSlug="agro" resumida />);
    expect(within(screen.getByRole('list', { name: 'Linha do tempo' })).getAllByRole('listitem')).toHaveLength(5);
  });

  it('carregando mostra o skeleton; vazio mostra o estado vazio', () => {
    mockLinha({ data: undefined, isPending: true });
    const { unmount } = render(<LinhaDoTempo equipeSlug="agro" />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    unmount();
    mockLinha({ data: [] });
    render(<LinhaDoTempo equipeSlug="agro" />);
    expect(screen.getByText('Nada por aqui ainda')).toBeInTheDocument();
  });

  it('erro mostra a mensagem da API e "Tentar de novo"', async () => {
    mockLinha({ data: undefined, isError: true, error: new ApiError(500, 'X', 'Falha na linha do tempo') });
    const user = userEvent.setup();
    render(<LinhaDoTempo equipeSlug="agro" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha na linha do tempo');
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('ProximoPasso (B3)', () => {
  const base = {
    slug: 'agro',
    nomeIdeia: 'Agro',
    status: 'ativa',
    etapa: { numero: 3, nome: 'Encontro 1' },
    pendenciasParaAvancar: [],
  } as unknown as EquipeDetalhe;

  it('lista as pendências da API; a tarefa leva direto a ela', () => {
    render(
      <ProximoPasso
        equipe={{
          ...base,
          pendenciasParaAvancar: [
            { tipo: 'tarefa', slug: 't1', titulo: 'Definir problema' },
            { tipo: 'integrante', slug: 'bia', nome: 'Bia', motivo: 'convite_pendente' },
            { tipo: 'entregavel', titulo: 'Pitch vídeo' },
          ],
        }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Definir problema' })).toHaveAttribute('href', '/aluno/tarefas#tarefa-t1');
    const lista = screen.getByTestId('proximo-passo-pendencias');
    expect(lista).toHaveTextContent('Bia ainda não aceitou o convite');
    expect(lista).toHaveTextContent('Pitch vídeo — o mentor ainda vai criar esta tarefa');
  });

  it('sem pendências: "Tudo entregue — aguardando a avaliação do mentor"', () => {
    render(<ProximoPasso equipe={base} />);
    expect(screen.getByText('Tudo entregue — aguardando a avaliação do mentor')).toBeInTheDocument();
  });

  it('equipe pronta não mostra pendências', () => {
    render(<ProximoPasso equipe={{ ...base, status: 'pronta_inovamf' }} />);
    expect(screen.getByText('Sua equipe está pronta para o InovAMF.')).toBeInTheDocument();
  });
});
