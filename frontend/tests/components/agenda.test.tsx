import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/data/api/consultas', () => ({ useAgenda: vi.fn(), useEtapas: vi.fn() }));

import { useAgenda, useEtapas } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import type { Agenda } from '@/data/api/tipos';
import { hojeISO } from '@/domain/prazo';
import { AgendaAdmin, MesaDoMentor } from '@/features/agenda/Agenda';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const DIA_MS = 86_400_000;
const ETAPAS = [1, 2, 3, 4, 5, 6].map((numero) => ({
  numero,
  nome: `Etapa ${numero}`,
  descricao: null,
  entregavel: null,
}));

const AGENDA: Agenda = {
  paraAvaliar: [
    {
      equipe: { slug: 'agro', nomeIdeia: 'AgroSmart' },
      tarefa: { slug: 't-pitch', titulo: 'Pitch vídeo' },
      versao: 2,
      entregueEm: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    },
  ],
  prazos: [
    {
      equipe: { slug: 'agro', nomeIdeia: 'AgroSmart' },
      tarefa: { slug: 't-bmc', titulo: 'BMC' },
      dataEntrega: '2026-09-01T00:00:00.000Z',
      status: 'atrasada',
    },
    {
      equipe: { slug: 'eco', nomeIdeia: 'EcoRota' },
      tarefa: { slug: 't-vpd', titulo: 'VPD' },
      dataEntrega: `${hojeISO(new Date(Date.now() + 3 * DIA_MS))}T00:00:00.000Z`,
      status: 'pendente',
    },
  ],
  equipes: [
    {
      slug: 'agro',
      nomeIdeia: 'AgroSmart',
      status: 'ativa',
      etapa: { numero: 3, nome: 'Encontro 1' },
      membrosAtivos: 3,
      faltamParaAvancar: 2,
      ultimoEvento: { titulo: 'Entrega enviada: Pitch vídeo (v2)', em: '2026-09-20T15:00:00Z' },
    },
    {
      slug: 'eco',
      nomeIdeia: 'EcoRota',
      status: 'ativa',
      etapa: { numero: 2, nome: 'Contato com a equipe' },
      membrosAtivos: 1,
      faltamParaAvancar: 1,
      ultimoEvento: null,
    },
  ],
};
const refetch = vi.fn();

function mockAgenda(parcial: Record<string, unknown> = {}) {
  vi.mocked(useAgenda).mockReturnValue({
    data: AGENDA,
    isPending: false,
    isError: false,
    error: null,
    refetch,
    ...parcial,
  } as unknown as R<typeof useAgenda>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAgenda();
  vi.mocked(useEtapas).mockReturnValue({ data: ETAPAS, isPending: false, isError: false } as unknown as R<
    typeof useEtapas
  >);
});

describe('MesaDoMentor (adendo 23/09)', () => {
  it('"Para avaliar": tarefa, equipe, versão, há quanto tempo e um clique até a aba Tarefas', () => {
    render(<MesaDoMentor />);
    const link = within(screen.getByRole('list', { name: 'Para avaliar' })).getByRole('link');
    expect(link).toHaveAttribute('href', '/orientador/equipes/agro?aba=tarefas');
    expect(link).toHaveTextContent('Pitch vídeo');
    expect(link).toHaveTextContent('AgroSmart');
    expect(link).toHaveTextContent('v2 enviada há 2 h');
  });

  it('contador no título do bloco (badge do DS com o total de itens)', () => {
    render(<MesaDoMentor />);
    const tituloAvaliar = screen.getByText('Para avaliar').closest('h3') as HTMLElement;
    expect(within(tituloAvaliar).getByText('1')).toBeInTheDocument();
    const tituloPrazos = screen.getByText('Prazos').closest('h3') as HTMLElement;
    expect(within(tituloPrazos).getByText('2')).toBeInTheDocument();
  });

  it('"Prazos": chips do DS com o status que veio da API', () => {
    render(<MesaDoMentor />);
    const itens = within(screen.getByRole('list', { name: 'Prazos' })).getAllByRole('listitem');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent('BMC');
    expect(within(itens[0]!).getByText(/^atrasada há \d+ dias?$/)).toBeInTheDocument();
    expect(within(itens[1]!).getByText('vence em 3 dias')).toBeInTheDocument();
    expect(within(itens[1]!).getByRole('link')).toHaveAttribute('href', '/orientador/equipes/eco?aba=tarefas');
  });

  it('"Minhas equipes": card clicável no estilo do kanban com StageTag da etapa, integrantes ativos, pendências e último evento', () => {
    render(<MesaDoMentor />);
    const agro = screen.getByRole('link', { name: 'AgroSmart' });
    expect(agro).toHaveAttribute('href', '/orientador/equipes/agro');
    expect(agro).toHaveTextContent('Etapa 3');
    expect(agro).toHaveTextContent('3 integrantes ativos');
    expect(agro).toHaveTextContent('Faltam 2 itens para avançar');
    expect(agro).toHaveTextContent('Entrega enviada: Pitch vídeo (v2)');
    expect(agro).toHaveTextContent('20/09/2026');

    const eco = screen.getByRole('link', { name: 'EcoRota' });
    expect(eco).toHaveTextContent('Etapa 2');
    expect(eco).toHaveTextContent('1 integrante ativo');
    expect(eco).toHaveTextContent('Falta 1 item para avançar');
    expect(eco).toHaveTextContent('Sem eventos ainda.');
  });

  it('equipe pronta mostra "Pronta para o InovAMF" no lugar das pendências', () => {
    mockAgenda({
      data: {
        ...AGENDA,
        equipes: [
          { ...AGENDA.equipes[0]!, status: 'pronta_inovamf', etapa: { numero: 6, nome: 'Encontro 4' }, faltamParaAvancar: 0 },
        ],
      },
    });
    render(<MesaDoMentor />);
    expect(screen.getByRole('link', { name: 'AgroSmart' })).toHaveTextContent('Pronta para o InovAMF');
  });

  it('sem nada: estado vazio em cada bloco', () => {
    mockAgenda({ data: { paraAvaliar: [], prazos: [], equipes: [] } });
    render(<MesaDoMentor />);
    expect(screen.getByText('Nenhuma entrega esperando avaliação.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum prazo vencido ou nos próximos 7 dias.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma equipe atribuída a você ainda.')).toBeInTheDocument();
  });

  it('carregando mostra o skeleton; erro mostra a mensagem da API e "Tentar de novo"', async () => {
    mockAgenda({ data: undefined, isPending: true });
    const { unmount } = render(<MesaDoMentor />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    unmount();

    mockAgenda({ data: undefined, isError: true, error: new ApiError(500, 'X', 'Agenda indisponível') });
    const user = userEvent.setup();
    render(<MesaDoMentor />);
    expect(screen.getByRole('alert')).toHaveTextContent('Agenda indisponível');
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('AgendaAdmin (adendo 23/09)', () => {
  it('mostra só "Para avaliar" e "Prazos", com links para o detalhe do admin', () => {
    render(<AgendaAdmin />);
    expect(screen.queryByText('Minhas equipes')).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Para avaliar' })).getByRole('link')).toHaveAttribute(
      'href',
      '/admin/equipes/agro?aba=tarefas',
    );
    expect(within(screen.getByRole('list', { name: 'Prazos' })).getAllByRole('link')[0]).toHaveAttribute(
      'href',
      '/admin/equipes/agro?aba=tarefas',
    );
  });
});
