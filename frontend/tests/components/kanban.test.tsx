import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
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

import {
  baixarCSV,
  useAreas,
  useCiclos,
  useEquipe,
  useEquipes,
  useEtapas,
  useMoverEtapa,
  useUsuarios,
} from '@/data/api/consultas';
import { useUsuario } from '@/data/api/useSessao';
import { ApiError } from '@/data/api/erro';
import type { EquipeDetalhe, EquipeResumo, Pendencia } from '@/data/api/tipos';
import { FunilBoard } from '@/features/funil/FunilBoard';
import { FunilKanban } from '@/features/orientador/FunilKanban';

const ETAPAS = [1, 2, 3, 4, 5, 6].map((numero) => ({
  numero,
  nome: `Etapa ${numero}`,
  descricao: null,
  entregavel: null,
}));

function equipe(p: Partial<EquipeResumo> & { slug: string; nomeIdeia: string }): EquipeResumo {
  return {
    descricaoIdeia: '',
    status: 'ativa',
    estagio: 'ideia',
    etapa: { numero: 1, nome: 'Etapa 1' },
    area: 'Tecnologia',
    ciclo: '2026/2',
    mentor: { slug: 'mentor-ana', nome: 'Ana' },
    lider: null,
    membrosCount: 3,
    tarefasAtrasadas: 0,
    criadoEm: '2026-08-01T00:00:00Z',
    ...p,
  } as EquipeResumo;
}

const EQUIPES: EquipeResumo[] = [
  equipe({ slug: 'agrosmart', nomeIdeia: 'AgroSmart', tarefasAtrasadas: 2 }),
  equipe({ slug: 'ecoaula', nomeIdeia: 'EcoAula', etapa: { numero: 3, nome: 'Etapa 3' }, area: 'Educação' }),
  equipe({
    slug: 'medlink',
    nomeIdeia: 'MedLink',
    etapa: { numero: 6, nome: 'Etapa 6' },
    status: 'pronta_inovamf',
    area: 'Saúde',
  }),
];

const mutate = vi.fn();
let pendenciasDetalhe: Pendencia[] = [];

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

function mockPadrao() {
  vi.mocked(useEquipes).mockReturnValue({
    data: EQUIPES,
    isPending: false,
    isError: false,
    isSuccess: true,
    error: null,
    refetch: vi.fn(),
  } as unknown as R<typeof useEquipes>);
  vi.mocked(useEtapas).mockReturnValue({
    data: ETAPAS,
    isPending: false,
    isError: false,
  } as unknown as R<typeof useEtapas>);
  vi.mocked(useAreas).mockReturnValue({
    data: [
      { nome: 'Tecnologia', ordem: 1 },
      { nome: 'Saúde', ordem: 2 },
    ],
  } as unknown as R<typeof useAreas>);
  vi.mocked(useCiclos).mockReturnValue({
    data: [{ nome: '2026/2', dataInicio: '2026-08-01', dataFim: null }],
  } as unknown as R<typeof useCiclos>);
  vi.mocked(useUsuarios).mockReturnValue({
    data: [{ slug: 'mentor-ana', nome: 'Ana' }],
  } as unknown as R<typeof useUsuarios>);
  vi.mocked(useEquipe).mockImplementation(
    (slug: string) =>
      ({
        data: { slug, pendenciasParaAvancar: pendenciasDetalhe } as unknown as EquipeDetalhe,
        isPending: false,
        isError: false,
      }) as unknown as R<typeof useEquipe>,
  );
  vi.mocked(useMoverEtapa).mockReturnValue({
    mutate,
    isPending: false,
  } as unknown as R<typeof useMoverEtapa>);
}

function comoAdmin() {
  vi.mocked(useUsuario).mockReturnValue({ slug: 'admin', nome: 'Admin', role: 'admin' } as R<typeof useUsuario>);
}
function comoMentor() {
  vi.mocked(useUsuario).mockReturnValue({ slug: 'mentor-ana', nome: 'Ana', role: 'mentor' } as R<typeof useUsuario>);
}

/** dataTransfer mínimo que o handler de arraste usa. */
function dtMock() {
  return { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '' };
}

/** Arrasta o card de `nome` para a coluna de índice `destino` (0-based). */
function arrastar(nome: string, destino: number, testid = 'coluna-funil') {
  const card = screen.getByText(nome).closest('[data-testid="equipe-card"]')!;
  const dt = dtMock();
  fireEvent.dragStart(card, { dataTransfer: dt });
  fireEvent.drop(screen.getAllByTestId(testid)[destino], { dataTransfer: dt });
}

beforeEach(() => {
  // rAF síncrono: o dragStart adia o set de "arrastando" para o próximo frame
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.clearAllMocks();
  pendenciasDetalhe = [];
  mockPadrao();
  comoAdmin();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FunilBoard — colunas e cards (API)', () => {
  it('mostra 6 etapas + "Pronta p/ InovAMF" e distribui as equipes por posição', () => {
    render(<FunilBoard modo="admin" />);
    const colunas = screen.getAllByTestId('coluna-funil');
    expect(colunas).toHaveLength(7);
    expect(colunas[0]).toHaveTextContent('1. Etapa 1');
    expect(colunas[0]).toHaveTextContent('AgroSmart');
    expect(colunas[2]).toHaveTextContent('EcoAula');
    expect(colunas[6]).toHaveTextContent('Pronta p/ InovAMF');
    expect(colunas[6]).toHaveTextContent('MedLink');
    expect(colunas[5]).not.toHaveTextContent('MedLink');
  });

  it('card mostra nome com link pelo slug, etapa, área e badge de atrasadas', () => {
    render(<FunilBoard modo="admin" />);
    const card = screen.getByText('AgroSmart').closest('[data-testid="equipe-card"]') as HTMLElement;
    expect(within(card).getByRole('link', { name: 'AgroSmart' })).toHaveAttribute(
      'href',
      '/admin/equipes/agrosmart',
    );
    expect(card).toHaveTextContent('Etapa 1');
    expect(card).toHaveTextContent('Tecnologia');
    expect(card).toHaveTextContent('2 tarefas');

    const eco = screen.getByText('EcoAula').closest('[data-testid="equipe-card"]') as HTMLElement;
    expect(eco).not.toHaveTextContent('tarefa');
  });

  it('mostra erro da API com "Tentar de novo" chamando refetch', async () => {
    const refetch = vi.fn();
    vi.mocked(useEquipes).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError(500, 'X', 'Falhou geral'),
      refetch,
    } as unknown as R<typeof useEquipes>);
    const user = userEvent.setup();
    render(<FunilBoard modo="admin" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou geral');
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('FunilBoard — filtros → FiltrosEquipes', () => {
  it('selects de área, curso, mentor, status e ciclo viram os campos da API', async () => {
    const user = userEvent.setup();
    render(<FunilBoard modo="admin" />);
    expect(useEquipes).toHaveBeenLastCalledWith({});

    await user.selectOptions(screen.getByLabelText('Filtrar por área'), 'Saúde');
    await user.selectOptions(screen.getByLabelText('Filtrar por curso'), 'Direito');
    await user.selectOptions(screen.getByLabelText('Filtrar por mentor'), 'mentor-ana');
    await user.selectOptions(screen.getByLabelText('Filtrar por status de tarefa'), 'atrasada');
    await user.selectOptions(screen.getByLabelText('Filtrar por ciclo'), '2026/2');

    expect(useEquipes).toHaveBeenLastCalledWith({
      area: 'Saúde',
      curso: 'Direito',
      mentor: 'mentor-ana',
      statusTarefa: 'atrasada',
      ciclo: '2026/2',
    });

    // "Todas as áreas" limpa o filtro
    await user.selectOptions(screen.getByLabelText('Filtrar por área'), '');
    expect(vi.mocked(useEquipes).mock.lastCall?.[0]).not.toHaveProperty('area');
  });

  it('a busca vira `q` (com espera curta)', async () => {
    const user = userEvent.setup();
    render(<FunilBoard modo="admin" />);
    await user.type(screen.getByLabelText('Buscar equipes'), 'agro');
    await waitFor(() => expect(useEquipes).toHaveBeenLastCalledWith({ q: 'agro' }));
  });

  it('preset de status (deep-link) entra como statusTarefa', () => {
    render(<FunilBoard modo="admin" statusPreset="atrasada" />);
    expect(useEquipes).toHaveBeenLastCalledWith({ statusTarefa: 'atrasada' });
    expect(screen.getByLabelText('Filtrar por status de tarefa')).toHaveValue('atrasada');
  });
});

describe('FunilBoard — mover (DialogoMover)', () => {
  it('soltar na próxima etapa confirma e chama mutate com { etapa: n }', async () => {
    const user = userEvent.setup();
    render(<FunilBoard modo="admin" />);
    arrastar('AgroSmart', 1);
    await waitFor(() => expect(screen.getByTestId('confirmar-movimento')).toBeInTheDocument());
    expect(screen.getByRole('dialog')).toHaveTextContent('de 1. Etapa 1 para 2. Etapa 2');
    expect(useEquipe).toHaveBeenCalledWith('agrosmart');
    expect(useMoverEtapa).toHaveBeenCalledWith('agrosmart');
    expect(screen.getByTestId('confirmar-movimento')).toHaveTextContent(/^Mover$/);

    await user.click(screen.getByTestId('confirmar-movimento'));
    expect(mutate).toHaveBeenCalledWith({ etapa: 2 }, expect.anything());
  });

  it('soltar na mesma coluna não abre o diálogo', () => {
    render(<FunilBoard modo="admin" />);
    arrastar('AgroSmart', 0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mover para "Pronta" envia etapa "pronta"; retroceder não pede observação', async () => {
    const user = userEvent.setup();
    render(<FunilBoard modo="admin" />);
    arrastar('MedLink', 4); // pronta → etapa 5 (retrocesso)
    await waitFor(() => expect(screen.getByTestId('confirmar-movimento')).toBeInTheDocument());
    expect(screen.queryByLabelText('Observação')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('confirmar-movimento'));
    expect(mutate).toHaveBeenLastCalledWith({ etapa: 5 }, expect.anything());
  });

  it('com pendências no preview, lista-as e exige observação antes de forçar', async () => {
    pendenciasDetalhe = [
      { tipo: 'tarefa', slug: 't1', titulo: 'Canvas' },
      { tipo: 'integrante', slug: 'u1', nome: 'Bia', motivo: 'convite_pendente' },
    ];
    const user = userEvent.setup();
    render(<FunilBoard modo="admin" />);
    arrastar('AgroSmart', 1);
    await waitFor(() => expect(screen.getByTestId('pendencias-mover')).toBeInTheDocument());
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('tarefa: Canvas');
    expect(dialogo).toHaveTextContent('integrante: Bia — convite pendente');

    await user.click(screen.getByTestId('confirmar-movimento'));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Explique o motivo para forçar o movimento.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Observação'), 'Mentor validou em reunião');
    await user.click(screen.getByTestId('confirmar-movimento'));
    expect(mutate).toHaveBeenCalledWith(
      { etapa: 2, forcado: true, observacao: 'Mentor validou em reunião' },
      expect.anything(),
    );
  });

  it('salto de etapa exige observação e envia forcado', async () => {
    const user = userEvent.setup();
    render(<FunilBoard modo="admin" />);
    arrastar('AgroSmart', 3); // 1 → 4
    await waitFor(() => expect(screen.getByLabelText('Observação')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Observação'), 'Aceleração');
    await user.click(screen.getByTestId('confirmar-movimento'));
    expect(mutate).toHaveBeenCalledWith(
      { etapa: 4, forcado: true, observacao: 'Aceleração' },
      expect.anything(),
    );
  });

  it('409 RN01_PENDENCIAS passa para "forçar" com as pendências da API e exige observação', async () => {
    mutate.mockImplementationOnce((_body, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(
        new ApiError(409, 'RN01_PENDENCIAS', 'Há pendências obrigatórias nesta etapa', {
          pendencias: [{ tipo: 'integrante', slug: 'u2', nome: 'Caio', motivo: 'dados_incompletos' }],
        }),
      ),
    );
    const user = userEvent.setup();
    render(<FunilBoard modo="admin" />);
    arrastar('AgroSmart', 1);
    await waitFor(() => expect(screen.getByTestId('confirmar-movimento')).toBeInTheDocument());
    await user.click(screen.getByTestId('confirmar-movimento'));
    expect(mutate).toHaveBeenNthCalledWith(1, { etapa: 2 }, expect.anything());

    const dialogo = screen.getByRole('dialog');
    expect(screen.getByRole('alert')).toHaveTextContent('Há pendências obrigatórias nesta etapa');
    expect(dialogo).toHaveTextContent('integrante: Caio — dados incompletos');
    expect(screen.getByTestId('confirmar-movimento')).toHaveTextContent('Forçar movimento');

    await user.click(screen.getByTestId('confirmar-movimento'));
    expect(mutate).toHaveBeenCalledTimes(1); // sem observação, não envia

    await user.type(screen.getByLabelText('Observação'), 'Dados chegam amanhã');
    await user.click(screen.getByTestId('confirmar-movimento'));
    expect(mutate).toHaveBeenNthCalledWith(
      2,
      { etapa: 2, forcado: true, observacao: 'Dados chegam amanhã' },
      expect.anything(),
    );
  });

  it('erro não-RN01 aparece como alerta; sucesso fecha o diálogo', async () => {
    mutate
      .mockImplementationOnce((_b, opts?: { onError?: (e: unknown) => void }) =>
        opts?.onError?.(new ApiError(403, 'NOT_TEAM_MENTOR', 'Equipe fora do seu escopo')),
      )
      .mockImplementationOnce((_b, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    const user = userEvent.setup();
    render(<FunilBoard modo="admin" />);
    arrastar('AgroSmart', 1);
    await waitFor(() => expect(screen.getByTestId('confirmar-movimento')).toBeInTheDocument());
    await user.click(screen.getByTestId('confirmar-movimento'));
    expect(screen.getByRole('alert')).toHaveTextContent('Equipe fora do seu escopo');
    expect(screen.queryByLabelText('Observação')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('confirmar-movimento'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('não existe mais "Desfazer" nem "não mostrar novamente"', async () => {
    render(<FunilBoard modo="admin" />);
    arrastar('AgroSmart', 1);
    await waitFor(() => expect(screen.getByTestId('confirmar-movimento')).toBeInTheDocument());
    expect(screen.queryByTestId('nao-mostrar-novamente')).not.toBeInTheDocument();
    expect(screen.queryByText('Desfazer')).not.toBeInTheDocument();
  });
});

describe('FunilBoard — CSV', () => {
  it('botão chama baixarCSV com os filtros atuais', async () => {
    vi.mocked(baixarCSV).mockResolvedValue();
    const user = userEvent.setup();
    render(<FunilBoard modo="admin" />);
    await user.selectOptions(screen.getByLabelText('Filtrar por área'), 'Saúde');
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(baixarCSV).toHaveBeenCalledWith({ area: 'Saúde' });
  });

  it('erro no CSV vira alerta', async () => {
    vi.mocked(baixarCSV).mockRejectedValue(new ApiError(500, 'X', 'CSV indisponível'));
    const user = userEvent.setup();
    render(<FunilBoard modo="admin" />);
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CSV indisponível');
  });
});

describe('FunilKanban (mentor)', () => {
  beforeEach(() => comoMentor());

  it('mostra as colunas e os cards com link do orientador', () => {
    render(<FunilKanban />);
    expect(screen.getAllByTestId('coluna-kanban')).toHaveLength(7);
    expect(screen.getByRole('link', { name: 'EcoAula' })).toHaveAttribute(
      'href',
      '/orientador/equipes/ecoaula',
    );
  });

  it('não renderiza o filtro de mentor nem chama useUsuarios, e não mostra CSV', () => {
    render(<FunilKanban />);
    expect(screen.queryByLabelText('Filtrar por mentor')).not.toBeInTheDocument();
    expect(useUsuarios).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Exportar CSV' })).not.toBeInTheDocument();
  });

  it('mentor também move pelo diálogo', async () => {
    const user = userEvent.setup();
    render(<FunilKanban />);
    arrastar('EcoAula', 3, 'coluna-kanban'); // 3 → 4
    await waitFor(() => expect(screen.getByTestId('confirmar-movimento')).toBeInTheDocument());
    await user.click(screen.getByTestId('confirmar-movimento'));
    expect(useMoverEtapa).toHaveBeenCalledWith('ecoaula');
    expect(mutate).toHaveBeenCalledWith({ etapa: 4 }, expect.anything());
  });
});
