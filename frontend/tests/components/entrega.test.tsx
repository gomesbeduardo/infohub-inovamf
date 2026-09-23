import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// ── Tarefas da equipe (admin/mentor) — TarefaList / AvaliarEntrega / NovaTarefaDialog ──
// (A área do aluno — MinhaEquipe / MinhasTarefas / EnviarEntregaDialog — é coberta em
// tests/components/aluno.test.tsx.)

vi.mock('@/data/api/consultas', () => ({
  useTarefas: vi.fn(),
  useEntregas: vi.fn(),
  useCriarTarefa: vi.fn(),
  useAvaliar: vi.fn(),
  useModelos: vi.fn(),
  useEtapas: vi.fn(),
}));

import {
  useAvaliar,
  useCriarTarefa,
  useEntregas,
  useEtapas,
  useModelos,
  useTarefas,
} from '@/data/api/consultas';
import type { EquipeDetalhe, Entrega, ModeloTarefa, Tarefa } from '@/data/api/tipos';
import { TarefaList } from '@/features/admin-tarefas/TarefaList';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const EQUIPE = { slug: 'agrosmart', etapa: { numero: 3, nome: 'Encontro 1' } } as EquipeDetalhe;

const ETAPAS = [1, 2, 3, 4, 5, 6].map((numero) => ({
  numero,
  nome: `Etapa ${numero}`,
  descricao: null,
  entregavel: null,
}));

const MODELOS: ModeloTarefa[] = [
  { id: 1, etapa: 2, titulo: 'Canvas do modelo de negócio', descricao: null, obrigatoria: true, prazoPadraoDias: 7 },
  { id: 2, etapa: 3, titulo: 'Pitch gravado', descricao: null, obrigatoria: false, prazoPadraoDias: 14 },
];

function tarefa(p: Partial<Tarefa> = {}): Tarefa {
  return {
    slug: 't-1',
    titulo: 'Gravar o Pitch Vídeo',
    descricao: 'Enviar o link do vídeo não listado',
    obrigatoria: true,
    dataEntrega: '2026-09-30T00:00:00.000Z',
    status: 'entregue',
    etapa: { numero: 3, nome: 'Encontro 1' },
    equipe: { slug: 'agrosmart', nomeIdeia: 'AgroSmart' },
    criadoEm: '2026-08-01T12:00:00Z',
    concluidaEm: null,
    ...p,
  };
}

const ENTREGAS: Entrega[] = [
  {
    slug: 'e-1',
    versao: 1,
    comentario: null,
    enviadoPor: { slug: 'lia', nome: 'Lia Líder' },
    criadoEm: '2026-09-10T10:00:00Z',
    arquivos: [{ tipo: 'link', nome: 'Vídeo v1', url: 'https://youtu.be/v1' }],
    avaliacoes: [],
  },
  {
    slug: 'e-2',
    versao: 2,
    comentario: 'Versão final',
    enviadoPor: { slug: 'lia', nome: 'Lia Líder' },
    criadoEm: '2026-09-15T10:00:00Z',
    arquivos: [
      { tipo: 'link', nome: 'Vídeo v2', url: 'https://youtu.be/v2' },
      { tipo: 'arquivo', nome: 'roteiro.pdf', url: 'https://files.example.com/roteiro.pdf' },
    ],
    avaliacoes: [],
  },
];

const criarMutate = vi.fn();
const avaliarMutate = vi.fn();
const refetchTarefas = vi.fn();
const refetchEntregas = vi.fn();

function mockTarefas(data: Tarefa[]) {
  vi.mocked(useTarefas).mockReturnValue({
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: refetchTarefas,
  } as unknown as R<typeof useTarefas>);
}

function mockEntregas(data: Entrega[]) {
  vi.mocked(useEntregas).mockReturnValue({
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: refetchEntregas,
  } as unknown as R<typeof useEntregas>);
}

function mockPadrao() {
  mockTarefas([tarefa()]);
  mockEntregas(ENTREGAS);
  vi.mocked(useModelos).mockReturnValue({
    data: MODELOS,
    isPending: false,
    isError: false,
  } as unknown as R<typeof useModelos>);
  vi.mocked(useEtapas).mockReturnValue({
    data: ETAPAS,
    isPending: false,
    isError: false,
  } as unknown as R<typeof useEtapas>);
  vi.mocked(useCriarTarefa).mockReturnValue({
    mutate: criarMutate,
    isPending: false,
  } as unknown as R<typeof useCriarTarefa>);
  vi.mocked(useAvaliar).mockReturnValue({
    mutate: avaliarMutate,
    isPending: false,
  } as unknown as R<typeof useAvaliar>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPadrao();
});

describe('TarefaList (admin/mentor)', () => {
  it('lista a tarefa com StatusBadge e a data sem deslocamento de fuso', () => {
    mockTarefas([tarefa({ dataEntrega: '2026-09-30T00:00:00.000Z' })]);
    render(<TarefaList equipe={EQUIPE} />);

    expect(screen.getByText('Gravar o Pitch Vídeo')).toBeInTheDocument();
    expect(screen.getByText('Entregue')).toBeInTheDocument();
    expect(screen.getByText(/30\/09\/2026/)).toBeInTheDocument();
    expect(screen.queryByText(/29\/09\/2026/)).not.toBeInTheDocument();
  });

  it('lista todas as versões das entregas com arquivos/links clicáveis', () => {
    render(<TarefaList equipe={EQUIPE} />);

    expect(screen.getByText(/v1 —/)).toBeInTheDocument();
    expect(screen.getByText(/v2 —/)).toBeInTheDocument();

    const link1 = screen.getByRole('link', { name: 'Vídeo v1' });
    expect(link1).toHaveAttribute('href', 'https://youtu.be/v1');
    expect(link1).toHaveAttribute('target', '_blank');
    expect(link1).toHaveAttribute('rel', 'noreferrer');

    const link2 = screen.getByRole('link', { name: 'Vídeo v2' });
    expect(link2).toHaveAttribute('href', 'https://youtu.be/v2');
    const arquivo2 = screen.getByRole('link', { name: 'roteiro.pdf' });
    expect(arquivo2).toHaveAttribute('href', 'https://files.example.com/roteiro.pdf');
  });

  it('erro ao carregar tarefas mostra alerta com "Tentar de novo"', async () => {
    const user = userEvent.setup();
    vi.mocked(useTarefas).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Falha ao carregar tarefas'),
      refetch: refetchTarefas,
    } as unknown as R<typeof useTarefas>);
    render(<TarefaList equipe={EQUIPE} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar tarefas');
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(refetchTarefas).toHaveBeenCalled();
  });
});

describe('AvaliarEntrega', () => {
  it('só aparece quando a tarefa está "entregue"', () => {
    mockTarefas([tarefa({ status: 'pendente' })]);
    render(<TarefaList equipe={EQUIPE} />);
    expect(screen.queryByRole('button', { name: /^aprovar$/i })).not.toBeInTheDocument();
  });

  it('aprovar avalia só a última versão: { entregaSlug: "e-2", resultado: "aprovada" }', async () => {
    const user = userEvent.setup();
    render(<TarefaList equipe={EQUIPE} />);
    await user.click(screen.getByRole('button', { name: /^aprovar$/i }));
    expect(useAvaliar).toHaveBeenCalledWith('t-1', 'agrosmart');
    expect(avaliarMutate).toHaveBeenCalledWith(
      { entregaSlug: 'e-2', resultado: 'aprovada' },
      expect.anything(),
    );
  });

  it('"Solicitar ajustes" exige comentário antes de enviar', async () => {
    const user = userEvent.setup();
    render(<TarefaList equipe={EQUIPE} />);

    await user.click(screen.getByRole('button', { name: /solicitar ajustes/i }));
    // sem comentário, o botão fica desabilitado e não envia
    await user.click(screen.getByRole('button', { name: /enviar avaliação/i }));
    expect(avaliarMutate).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/comentário da avaliação/i), 'Refazer o áudio do vídeo');
    await user.click(screen.getByRole('button', { name: /enviar avaliação/i }));
    expect(avaliarMutate).toHaveBeenCalledWith(
      { entregaSlug: 'e-2', resultado: 'ajustar', comentario: 'Refazer o áudio do vídeo' },
      expect.anything(),
    );
  });
});

describe('NovaTarefaDialog', () => {
  it('modo "De um modelo" envia { modelo, dataEntrega } quando a data é informada', async () => {
    const user = userEvent.setup();
    render(<TarefaList equipe={EQUIPE} />);
    await user.click(screen.getByRole('button', { name: /nova tarefa/i }));
    const dialog = screen.getByRole('dialog');

    await user.selectOptions(within(dialog).getByLabelText('Modelo de tarefa'), '2');
    const data = within(dialog).getByLabelText('Data de entrega');
    await user.clear(data);
    await user.type(data, '2026-10-10');
    await user.click(within(dialog).getByRole('button', { name: /criar tarefa/i }));

    expect(useCriarTarefa).toHaveBeenCalledWith('agrosmart');
    expect(criarMutate).toHaveBeenCalledWith(
      { modelo: 2, dataEntrega: '2026-10-10' },
      expect.anything(),
    );
  });

  it('modo "De um modelo" sem data envia só { modelo }', async () => {
    const user = userEvent.setup();
    render(<TarefaList equipe={EQUIPE} />);
    await user.click(screen.getByRole('button', { name: /nova tarefa/i }));
    const dialog = screen.getByRole('dialog');

    await user.selectOptions(within(dialog).getByLabelText('Modelo de tarefa'), '2');
    await user.click(within(dialog).getByRole('button', { name: /criar tarefa/i }));

    expect(criarMutate).toHaveBeenCalledWith({ modelo: 2 }, expect.anything());
  });

  it('modo manual vem com "obrigatória" marcada por padrão e envia o corpo completo', async () => {
    const user = userEvent.setup();
    render(<TarefaList equipe={EQUIPE} />);
    await user.click(screen.getByRole('button', { name: /nova tarefa/i }));
    const dialog = screen.getByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: /^manual$/i }));
    expect(within(dialog).getByRole('checkbox')).toBeChecked();

    await user.type(within(dialog).getByLabelText('Título'), 'Entrevistar 5 usuários');
    const data = within(dialog).getByLabelText('Data de entrega');
    await user.clear(data);
    await user.type(data, '2026-10-20');
    await user.click(within(dialog).getByRole('button', { name: /criar tarefa/i }));

    expect(criarMutate).toHaveBeenCalledWith(
      {
        titulo: 'Entrevistar 5 usuários',
        descricao: undefined,
        etapa: 3,
        dataEntrega: '2026-10-20',
        obrigatoria: true,
      },
      expect.anything(),
    );
  });
});
