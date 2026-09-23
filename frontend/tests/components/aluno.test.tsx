import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/data/api/consultas', () => ({
  useEquipes: vi.fn(),
  useEquipe: vi.fn(),
  useTarefas: vi.fn(),
  useEntregas: vi.fn(),
  useEnviarEntrega: vi.fn(),
  useEtapas: vi.fn(),
  useAdicionarMembro: vi.fn(),
  useGerarConvite: vi.fn(),
}));
vi.mock('@/data/api/useSessao', () => ({ useUsuario: vi.fn() }));

import {
  useAdicionarMembro,
  useEnviarEntrega,
  useEntregas,
  useEquipe,
  useEquipes,
  useEtapas,
  useGerarConvite,
  useTarefas,
} from '@/data/api/consultas';
import { useUsuario } from '@/data/api/useSessao';
import type { Entrega, Etapa, EquipeDetalhe, EquipeResumo, Tarefa } from '@/data/api/tipos';
import { MinhaEquipe } from '@/features/aluno-equipe/MinhaEquipe';
import { MinhasTarefas } from '@/features/aluno-tarefas/MinhasTarefas';
import { EnviarEntregaDialog } from '@/features/aluno-tarefas/EnviarEntregaDialog';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const ETAPAS: Etapa[] = [1, 2, 3, 4, 5, 6].map((numero) => ({
  numero,
  nome: `Etapa ${numero}`,
  descricao: null,
  entregavel: null,
}));

const RESUMO: EquipeResumo = {
  slug: 'agrosmart',
  nomeIdeia: 'AgroSmart',
  descricaoIdeia: 'Sensores de umidade para pequenas lavouras.',
  status: 'ativa',
  estagio: 'prototipo',
  etapa: { numero: 3, nome: 'Etapa 3' },
  area: 'Agronegócio',
  ciclo: '2026/2',
  mentor: { slug: 'mentor-ana', nome: 'Ana Mentora' },
  lider: { slug: 'lia', nome: 'Lia Líder', curso: 'Direito' },
  membrosCount: 3,
  tarefasAtrasadas: 0,
  criadoEm: '2026-08-01T12:00:00Z',
};

function detalhe(p: Partial<EquipeDetalhe> = {}): EquipeDetalhe {
  return {
    slug: 'agrosmart',
    nomeIdeia: 'AgroSmart',
    descricaoIdeia: 'Sensores de umidade para pequenas lavouras.',
    estagio: 'prototipo',
    status: 'ativa',
    origemDivulgacao: 'Instagram',
    prontaInovamfEm: null,
    criadoEm: '2026-08-01T12:00:00Z',
    etapa: { numero: 3, nome: 'Etapa 3' },
    area: 'Agronegócio',
    ciclo: '2026/2',
    mentor: { slug: 'mentor-ana', nome: 'Ana Mentora' },
    membros: [
      { slug: 'lia', nome: 'Lia Líder', papel: 'lider', tipo: 'aluno', pendente: false, curso: 'Direito', semestre: '3' },
      { slug: 'caio', nome: 'Caio Integrante', papel: 'integrante', tipo: 'aluno', pendente: false, curso: 'Agronomia', semestre: '5º' },
      { slug: 'bia', nome: 'Bia Pendente', papel: 'integrante', tipo: 'aluno', pendente: true, curso: null, semestre: null },
    ],
    historico: [],
    pendenciasParaAvancar: [],
    ...p,
  } as EquipeDetalhe;
}

function tarefa(p: Partial<Tarefa> = {}): Tarefa {
  return {
    slug: 't-1',
    titulo: 'Definir problema e público-alvo',
    descricao: null,
    obrigatoria: true,
    dataEntrega: '2026-09-30T00:00:00.000Z',
    status: 'pendente',
    etapa: { numero: 3, nome: 'Etapa 3' },
    equipe: { slug: 'agrosmart', nomeIdeia: 'AgroSmart' },
    criadoEm: '2026-08-01T12:00:00Z',
    concluidaEm: null,
    ...p,
  };
}

const enviarMutate = vi.fn();
const gerarMutate = vi.fn();
const adicionarMutate = vi.fn();

function mockEquipes(data: EquipeResumo[]) {
  vi.mocked(useEquipes).mockReturnValue({
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as R<typeof useEquipes>);
}

function mockEquipe(d: EquipeDetalhe) {
  vi.mocked(useEquipe).mockReturnValue({
    data: d,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as R<typeof useEquipe>);
}

function mockTarefas(data: Tarefa[]) {
  vi.mocked(useTarefas).mockReturnValue({
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as R<typeof useTarefas>);
}

function mockEntregas(porTarefa: Record<string, Entrega[]>) {
  vi.mocked(useEntregas).mockImplementation(((tarefaSlug: string) => ({
    data: porTarefa[tarefaSlug] ?? [],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })) as unknown as typeof useEntregas);
}

function mockPadrao() {
  mockEquipes([RESUMO]);
  mockEquipe(detalhe());
  mockTarefas([tarefa()]);
  mockEntregas({});
  vi.mocked(useEtapas).mockReturnValue({ data: ETAPAS, isPending: false, isError: false } as unknown as R<
    typeof useEtapas
  >);
  vi.mocked(useEnviarEntrega).mockReturnValue({ mutate: enviarMutate, isPending: false } as unknown as R<
    typeof useEnviarEntrega
  >);
  vi.mocked(useGerarConvite).mockReturnValue({ mutate: gerarMutate, isPending: false } as unknown as R<
    typeof useGerarConvite
  >);
  vi.mocked(useAdicionarMembro).mockReturnValue({ mutate: adicionarMutate, isPending: false } as unknown as R<
    typeof useAdicionarMembro
  >);
}

function comoLider() {
  vi.mocked(useUsuario).mockReturnValue({ slug: 'lia', nome: 'Lia Líder', role: 'aluno' } as R<typeof useUsuario>);
}
function comoIntegrante() {
  vi.mocked(useUsuario).mockReturnValue({
    slug: 'caio',
    nome: 'Caio Integrante',
    role: 'aluno',
  } as R<typeof useUsuario>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPadrao();
  comoLider();
});

describe('MinhaEquipe', () => {
  it('sem equipe mostra o estado vazio com link para /cadastro', () => {
    mockEquipes([]);
    render(<MinhaEquipe />);

    expect(screen.getByText('Você ainda não faz parte de uma equipe')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cadastrar ideia/i })).toHaveAttribute('href', '/cadastro');
  });

  it('mostra a ideia, o progresso no funil e os integrantes', () => {
    render(<MinhaEquipe />);

    expect(screen.getByRole('heading', { name: 'AgroSmart' })).toBeInTheDocument();
    expect(screen.getByText('Progresso no funil')).toBeInTheDocument();
    expect(screen.getByText('Etapa atual')).toBeInTheDocument();
    expect(screen.getByText('Lia Líder')).toBeInTheDocument();
    expect(screen.getByText('Caio Integrante')).toBeInTheDocument();
    // resumo de pendências no atalho para "Minhas tarefas"
    expect(screen.getByText(/1 pendente.*próxima até 30\/09\/2026/)).toBeInTheDocument();
  });

  it('o líder vê "Adicionar integrante" e "Gerar link" para convite pendente', () => {
    render(<MinhaEquipe />);

    expect(screen.getByRole('button', { name: /adicionar integrante/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gerar link/i })).toBeInTheDocument();
  });

  it('quem não é líder não vê "Adicionar integrante" nem "Gerar link"', () => {
    comoIntegrante();
    render(<MinhaEquipe />);

    expect(screen.queryByRole('button', { name: /adicionar integrante/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerar link/i })).not.toBeInTheDocument();
  });
});

describe('MinhasTarefas', () => {
  it('separa "A fazer" (pendente/em_andamento/atrasada/ajustar) de "Concluídas" (entregue/aprovada)', () => {
    mockTarefas([
      tarefa({ slug: 't-1', titulo: 'Tarefa pendente', status: 'pendente' }),
      tarefa({ slug: 't-2', titulo: 'Tarefa atrasada', status: 'atrasada' }),
      tarefa({ slug: 't-3', titulo: 'Tarefa ajustar', status: 'ajustar' }),
      tarefa({ slug: 't-4', titulo: 'Tarefa entregue', status: 'entregue' }),
      tarefa({ slug: 't-5', titulo: 'Tarefa aprovada', status: 'aprovada' }),
    ]);
    render(<MinhasTarefas />);

    const aFazer = screen.getByRole('heading', { name: 'A fazer' }).closest('section')!;
    expect(within(aFazer).getByText('Tarefa pendente')).toBeInTheDocument();
    expect(within(aFazer).getByText('Tarefa atrasada')).toBeInTheDocument();
    expect(within(aFazer).getByText('Tarefa ajustar')).toBeInTheDocument();
    expect(within(aFazer).queryByText('Tarefa entregue')).not.toBeInTheDocument();

    const concluidas = screen.getByRole('heading', { name: 'Concluídas' }).closest('section')!;
    expect(within(concluidas).getByText('Tarefa entregue')).toBeInTheDocument();
    expect(within(concluidas).getByText('Tarefa aprovada')).toBeInTheDocument();
  });

  it('mostra o comentário da última avaliação quando a tarefa está "ajustar"', () => {
    const entregas: Entrega[] = [
      {
        slug: 'e-1',
        versao: 1,
        comentario: null,
        enviadoPor: { slug: 'lia', nome: 'Lia Líder' },
        criadoEm: '2026-09-01T10:00:00Z',
        arquivos: [],
        avaliacoes: [
          {
            resultado: 'ajustar',
            comentario: 'Revisar o público-alvo',
            por: { slug: 'mentor-ana', nome: 'Ana Mentora' },
            em: '2026-09-05T10:00:00Z',
          },
        ],
      },
    ];
    mockTarefas([tarefa({ status: 'ajustar' })]);
    mockEntregas({ 't-1': entregas });
    render(<MinhasTarefas />);

    expect(screen.getByText(/Revisar o público-alvo/)).toBeInTheDocument();
  });
});

describe('EnviarEntregaDialog', () => {
  function renderDialog() {
    return render(
      <EnviarEntregaDialog
        tarefaSlug="t-1"
        equipeSlug="agrosmart"
        tituloTarefa="Definir problema e público-alvo"
      />,
    );
  }

  it('a aba "Arquivo" fica desabilitada com o aviso "Envio de arquivo em breve"', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /enviar entrega/i }));

    expect(screen.getByRole('tab', { name: 'Arquivo' })).toBeDisabled();
    expect(screen.getByText('Envio de arquivo em breve')).toBeInTheDocument();
  });

  it('bloqueia um link sem https no cliente', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /enviar entrega/i }));

    await user.type(screen.getByLabelText(/url do link/i), 'http://inseguro.com');
    await user.click(screen.getByRole('button', { name: /adicionar/i }));

    expect(screen.getByText(/precisa começar com https/i)).toBeInTheDocument();
    expect(enviarMutate).not.toHaveBeenCalled();
  });

  it('envia { links: [{ url }], comentario }', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /enviar entrega/i }));

    await user.type(screen.getByLabelText(/url do link/i), 'https://drive.example.com/doc');
    await user.type(screen.getByLabelText(/comentário/i), 'Segue o material solicitado');
    await user.click(screen.getByRole('button', { name: /^enviar$/i }));

    expect(useEnviarEntrega).toHaveBeenCalledWith('t-1', 'agrosmart');
    expect(enviarMutate).toHaveBeenCalledWith(
      { links: [{ url: 'https://drive.example.com/doc' }], comentario: 'Segue o material solicitado' },
      expect.anything(),
    );
  });
});
