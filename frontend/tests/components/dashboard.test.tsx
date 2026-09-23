import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// jsdom não implementa ResizeObserver; o LineChart usa para medir a largura.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/data/api/consultas', () => ({
  useDashboard: vi.fn(),
  useAgenda: vi.fn(),
  useEtapas: vi.fn(),
}));

import { useAgenda, useDashboard, useEtapas } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import type { Dashboard } from '@/data/api/tipos';
import { DashboardIndicadores } from '@/features/admin-dashboard/DashboardIndicadores';
import { PainelOrientador } from '@/features/orientador/PainelOrientador';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const DASHBOARD: Dashboard = {
  equipesAtivas: 12,
  prontasInovamf: 3,
  totalEquipes: 20,
  tarefasAtrasadas: 4,
  aAvaliar: 7,
  porEtapa: [
    { numero: 1, nome: 'Envio da ideia', total: 5 },
    { numero: 2, nome: 'Contato com a equipe', total: 3 },
    { numero: 3, nome: 'Encontro 1', total: 2 },
    { numero: 4, nome: 'Encontro 2', total: 1 },
    { numero: 5, nome: 'Encontro 3', total: 1 },
    { numero: 6, nome: 'Encontro 4', total: 0 },
  ],
  serieSemanal: [
    { semanaInicio: '2026-08-03', rotulo: '03/08', avancos: 2, entregas: 5 },
    { semanaInicio: '2026-08-10', rotulo: '10/08', avancos: 1, entregas: 3 },
  ],
};

function mockDashboard(v: Partial<R<typeof useDashboard>>) {
  vi.mocked(useDashboard).mockReturnValue({
    data: DASHBOARD,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...v,
  } as unknown as R<typeof useDashboard>);
}

beforeEach(() => {
  vi.mocked(useAgenda).mockReturnValue({
    data: { paraAvaliar: [], prazos: [], equipes: [] },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as R<typeof useAgenda>);
  vi.mocked(useEtapas).mockReturnValue({ data: [], isPending: false, isError: false } as unknown as R<
    typeof useEtapas
  >);
});

describe('DashboardIndicadores', () => {
  it('mostra os cards com os números da API', () => {
    mockDashboard({});
    render(<DashboardIndicadores />);

    expect(screen.getByText('Equipes ativas').closest('a')).toHaveTextContent('12');
    expect(screen.getByText('Prontas p/ InovAMF').closest('a')).toHaveTextContent('3');
    const atrasadas = screen.getByText('Tarefas atrasadas').closest('a') as HTMLElement;
    expect(atrasadas).toHaveTextContent('4');
    expect(atrasadas).toHaveAttribute('href', '/admin?status=atrasada');
    expect(screen.getByText('Total de equipes').closest('a')).toHaveTextContent('20');
  });

  it('as barras de distribuição por etapa usam os totais da API', () => {
    mockDashboard({});
    render(<DashboardIndicadores />);

    const grafico = screen.getByRole('img');
    expect(grafico).toHaveAccessibleName(/etapa 1 \(Envio da ideia\): 5/i);
    expect(grafico).toHaveAccessibleName(/etapa 6 \(Encontro 4\): 0/i);
  });

  it('carregando mostra "Carregando…"', () => {
    mockDashboard({ isPending: true, data: undefined });
    render(<DashboardIndicadores />);
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('erro mostra a mensagem e "Tentar de novo" chamando refetch', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockDashboard({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError(500, 'X', 'Servidor fora do ar'),
      refetch,
    });
    render(<DashboardIndicadores />);

    expect(screen.getByRole('alert')).toHaveTextContent('Servidor fora do ar');
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('PainelOrientador', () => {
  it('a mesa do mentor aparece no topo da visão geral', () => {
    mockDashboard({});
    render(<PainelOrientador />);
    const mesa = screen.getByRole('region', { name: 'Mesa do mentor' });
    expect(within(mesa).getByText('Para avaliar')).toBeInTheDocument();
    expect(within(mesa).getByText('Prazos')).toBeInTheDocument();
    expect(within(mesa).getByText('Minhas equipes')).toBeInTheDocument();
  });

  it('mostra os cards com totalEquipes/aAvaliar/tarefasAtrasadas/prontasInovamf da API', () => {
    mockDashboard({});
    render(<PainelOrientador />);

    expect(screen.getByText('Equipes mentoradas').closest('button')).toHaveTextContent('20');
    expect(screen.getByText('Entregas a avaliar').closest('button')).toHaveTextContent('7');
    expect(screen.getByText('Tarefas atrasadas').closest('button')).toHaveTextContent('4');
    expect(screen.getByText('Prontas p/ InovAMF').closest('button')).toHaveTextContent('3');
  });

  it('o gráfico recebe a serieSemanal (rotulo/avancos/entregas) da API', () => {
    mockDashboard({});
    const { container } = render(<PainelOrientador />);

    const grafico = within(container).getByRole('img', {
      name: /gráfico de linha com avanços de etapa e entregas concluídas por semana/i,
    });
    expect(grafico).toBeInTheDocument();
    expect(screen.getByText('03/08')).toBeInTheDocument();
    expect(screen.getByText('10/08')).toBeInTheDocument();
  });

  it('carregando mostra "Carregando…"', () => {
    mockDashboard({ isPending: true, data: undefined });
    render(<PainelOrientador />);
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('erro mostra a mensagem e "Tentar de novo" chamando refetch', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockDashboard({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError(500, 'X', 'Painel indisponível'),
      refetch,
    });
    render(<PainelOrientador />);

    expect(screen.getByRole('alert')).toHaveTextContent('Painel indisponível');
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
