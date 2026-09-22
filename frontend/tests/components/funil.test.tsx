import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock('@/data/api/consultas', () => ({
  useEquipes: vi.fn(),
  useEquipe: vi.fn(),
  useMoverEtapa: vi.fn(),
  baixarCSV: vi.fn(),
  useEtapas: vi.fn(),
  useAreas: vi.fn(),
  useCiclos: vi.fn(),
  useUsuarios: vi.fn(),
}));
vi.mock('@/data/api/useSessao', () => ({ useUsuario: vi.fn() }));

import { useAreas, useCiclos, useEquipes, useEtapas, useUsuarios } from '@/data/api/consultas';
import { useUsuario } from '@/data/api/useSessao';
import { ApiError } from '@/data/api/erro';
import type { EquipeResumo } from '@/data/api/tipos';
import { Funil } from '@/features/admin-funil/Funil';
import { EquipesList } from '@/features/admin-equipes/EquipesList';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const EQUIPES = [
  {
    slug: 'ecoaula', nomeIdeia: 'EcoAula', descricaoIdeia: '', status: 'ativa', estagio: 'ideia',
    etapa: { numero: 3, nome: 'Validação' }, area: 'Educação', ciclo: '2026/2',
    mentor: { slug: 'mentor-ana', nome: 'Ana Mentora' }, lider: null, membrosCount: 2,
    tarefasAtrasadas: 1, criadoEm: '2026-08-01T00:00:00Z',
  },
  {
    slug: 'agrosmart', nomeIdeia: 'AgroSmart', descricaoIdeia: '', status: 'pronta_inovamf', estagio: 'ideia',
    etapa: { numero: 6, nome: 'Pitch' }, area: null, ciclo: null, mentor: null, lider: null,
    membrosCount: 1, tarefasAtrasadas: 0, criadoEm: '2026-08-01T00:00:00Z',
  },
] as EquipeResumo[];

function mockLista(estado: Record<string, unknown> = {}) {
  vi.mocked(useEquipes).mockReturnValue({
    data: EQUIPES, isPending: false, isError: false, isSuccess: true, error: null, refetch: vi.fn(),
    ...estado,
  } as unknown as R<typeof useEquipes>);
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.search = '';
  mockLista();
  vi.mocked(useEtapas).mockReturnValue({
    data: [1, 2, 3, 4, 5, 6].map((n) => ({ numero: n, nome: `E${n}`, descricao: null, entregavel: null })),
    isPending: false,
    isError: false,
  } as unknown as R<typeof useEtapas>);
  vi.mocked(useAreas).mockReturnValue({ data: [] } as unknown as R<typeof useAreas>);
  vi.mocked(useCiclos).mockReturnValue({ data: [] } as unknown as R<typeof useCiclos>);
  vi.mocked(useUsuarios).mockReturnValue({ data: [] } as unknown as R<typeof useUsuarios>);
  vi.mocked(useUsuario).mockReturnValue({ slug: 'admin', nome: 'Admin', role: 'admin' } as R<typeof useUsuario>);
});

describe('Funil (admin)', () => {
  it('mostra 7 colunas (6 etapas + pronta p/ InovAMF)', () => {
    render(<Funil />);
    expect(screen.getAllByTestId('coluna-funil')).toHaveLength(7);
  });

  it('aplica o filtro vindo da URL (?status=atrasada) como statusTarefa', () => {
    nav.search = 'status=atrasada';
    render(<Funil />);
    expect(useEquipes).toHaveBeenLastCalledWith({ statusTarefa: 'atrasada' });
  });

  it('ignora ?status= inválido', () => {
    nav.search = 'status=qualquer';
    render(<Funil />);
    expect(useEquipes).toHaveBeenLastCalledWith({});
  });

  it('admin vê o filtro de mentor (useUsuarios("mentor"))', () => {
    render(<Funil />);
    expect(screen.getByLabelText('Filtrar por mentor')).toBeInTheDocument();
    expect(useUsuarios).toHaveBeenCalledWith('mentor');
  });
});

describe('EquipesList (API)', () => {
  it('lista nome, área, "{n}. {nome}", status, mentor e atrasadas', () => {
    render(<EquipesList />);
    const linhas = screen.getAllByTestId('linha-equipe');
    expect(linhas).toHaveLength(2);
    // ordenada por etapa
    expect(linhas[0]).toHaveTextContent('EcoAula');
    expect(linhas[0]).toHaveTextContent('Educação');
    expect(linhas[0]).toHaveTextContent('3. Validação');
    expect(linhas[0]).toHaveTextContent('Ativa');
    expect(linhas[0]).toHaveTextContent('Ana Mentora');
    expect(linhas[0]).toHaveTextContent('1');
    expect(linhas[1]).toHaveTextContent('6. Pitch');
    expect(linhas[1]).toHaveTextContent('Pronta p/ InovAMF');
    expect(linhas[1]).toHaveTextContent('—');
    expect(screen.getByRole('link', { name: 'EcoAula' })).toHaveAttribute('href', '/admin/equipes/ecoaula');
    expect(screen.getByText('2 equipes')).toBeInTheDocument();
  });

  it('a busca vira `q` na consulta', async () => {
    const user = userEvent.setup();
    render(<EquipesList />);
    expect(useEquipes).toHaveBeenLastCalledWith({});
    await user.type(screen.getByLabelText('Buscar equipes'), 'eco');
    await waitFor(() => expect(useEquipes).toHaveBeenLastCalledWith({ q: 'eco' }));
  });

  it('erro mostra a mensagem e "Tentar de novo"', async () => {
    const refetch = vi.fn();
    mockLista({ data: undefined, isError: true, isSuccess: false, error: new ApiError(500, 'X', 'Servidor fora'), refetch });
    const user = userEvent.setup();
    render(<EquipesList />);
    expect(screen.getByRole('alert')).toHaveTextContent('Servidor fora');
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('lista vazia mostra o estado vazio', () => {
    mockLista({ data: [] });
    render(<EquipesList />);
    expect(screen.getByText('Nenhuma equipe encontrada')).toBeInTheDocument();
  });
});
