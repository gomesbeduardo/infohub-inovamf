import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/data/api/consultas', () => ({
  useEquipe: vi.fn(),
  useMoverEtapa: vi.fn(),
  useAnotacoes: vi.fn(),
  useAnotar: vi.fn(),
  useAdicionarMembro: vi.fn(),
  useGerarConvite: vi.fn(),
  useEtapas: vi.fn(),
  useLinhaDoTempo: vi.fn(),
  useUsuarios: vi.fn(),
  useAtualizarEquipe: vi.fn(),
  useEnviarLembrete: vi.fn(),
}));
vi.mock('@/data/api/useSessao', () => ({ useUsuario: vi.fn() }));

import {
  useAdicionarMembro,
  useAnotacoes,
  useAnotar,
  useAtualizarEquipe,
  useEnviarLembrete,
  useEquipe,
  useEtapas,
  useGerarConvite,
  useLinhaDoTempo,
  useMoverEtapa,
  useUsuarios,
} from '@/data/api/consultas';
import { useUsuario } from '@/data/api/useSessao';
import { ApiError } from '@/data/api/erro';
import type { Anotacao, EquipeDetalhe, ItemLinhaDoTempo, UsuarioAdmin } from '@/data/api/tipos';
import { DetalheEquipe } from '@/features/admin-detalhe/DetalheEquipe';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const ETAPAS = [1, 2, 3, 4, 5, 6].map((numero) => ({
  numero,
  nome: `Etapa ${numero}`,
  descricao: null,
  entregavel: null,
}));

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
    etapa: { numero: 3, nome: 'Encontro 1' },
    area: 'Agronegócio',
    ciclo: '2026/2',
    mentor: { slug: 'mentor-ana', nome: 'Ana Mentora' },
    membros: [
      { slug: 'lia', nome: 'Lia Líder', papel: 'lider', tipo: 'aluno', pendente: false, curso: 'Direito', semestre: '3' },
      { slug: 'bia', nome: 'Bia Pendente', papel: 'membro', tipo: 'aluno', pendente: true, curso: null, semestre: null },
      { slug: 'caio', nome: 'Caio Membro', papel: 'membro', tipo: 'aluno', pendente: false, curso: 'Agronomia', semestre: '5º' },
    ],
    historico: [
      { de: null, para: 1, forcado: false, observacao: null, por: null, em: '2026-08-01T12:00:00Z' },
      { de: 6, para: 'pronta', forcado: true, observacao: 'Banca antecipada', por: { slug: 'admin', nome: 'Coord Admin' }, em: '2026-09-10T15:30:00Z' },
    ],
    pendenciasParaAvancar: [],
    ...p,
  } as EquipeDetalhe;
}

const ANOTACOES: Anotacao[] = [
  { slug: 'a1', conteudo: 'Primeira conversa', autor: { slug: 'mentor-ana', nome: 'Ana Mentora' }, etapa: 2, criadoEm: '2026-08-10T10:00:00Z' },
  { slug: 'a2', conteudo: 'Encontro produtivo', autor: { slug: 'admin', nome: 'Coord Admin' }, etapa: 3, criadoEm: '2026-09-01T10:00:00Z' },
];

const LINHA: ItemLinhaDoTempo[] = [
  {
    tipo: 'etapa',
    titulo: 'Etapa 6 → Pronta p/ InovAMF (forçado)',
    detalhe: 'Banca antecipada',
    autor: 'Coord Admin',
    em: '2026-09-10T15:30:00Z',
  },
  { tipo: 'avaliacao', titulo: 'Entrega aprovada: Pitch', autor: 'Ana Mentora', em: '2026-09-09T10:00:00Z' },
];

const mover = vi.fn();
const gerar = vi.fn();
const adicionar = vi.fn();
const anotar = vi.fn();
const refetch = vi.fn();
const atualizarEquipe = vi.fn();
const enviarLembrete = vi.fn();

const MENTORES: UsuarioAdmin[] = [
  { slug: 'mentor-ana', nome: 'Ana Mentora', email: 'ana@amf.edu.br', telefone: '', role: 'mentor', ativo: true, conviteAceito: true },
  { slug: 'mentor-bruno', nome: 'Bruno Mentor', email: 'bruno@amf.edu.br', telefone: '', role: 'mentor', ativo: true, conviteAceito: true },
  { slug: 'mentor-inativo', nome: 'Inativo Mentor', email: 'x@amf.edu.br', telefone: '', role: 'mentor', ativo: false, conviteAceito: true },
];

function mockEquipe(d: EquipeDetalhe) {
  vi.mocked(useEquipe).mockReturnValue({
    data: d,
    isPending: false,
    isError: false,
    isSuccess: true,
    error: null,
    refetch,
  } as unknown as R<typeof useEquipe>);
}

function mockPadrao() {
  mockEquipe(detalhe());
  vi.mocked(useEtapas).mockReturnValue({ data: ETAPAS, isPending: false, isError: false } as unknown as R<
    typeof useEtapas
  >);
  vi.mocked(useMoverEtapa).mockReturnValue({ mutate: mover, isPending: false } as unknown as R<typeof useMoverEtapa>);
  vi.mocked(useGerarConvite).mockReturnValue({ mutate: gerar, isPending: false } as unknown as R<
    typeof useGerarConvite
  >);
  vi.mocked(useAdicionarMembro).mockReturnValue({ mutate: adicionar, isPending: false } as unknown as R<
    typeof useAdicionarMembro
  >);
  vi.mocked(useAnotar).mockReturnValue({ mutate: anotar, isPending: false } as unknown as R<typeof useAnotar>);
  vi.mocked(useAnotacoes).mockReturnValue({
    data: ANOTACOES,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as R<typeof useAnotacoes>);
  vi.mocked(useLinhaDoTempo).mockReturnValue({
    data: LINHA,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as R<typeof useLinhaDoTempo>);
  vi.mocked(useUsuarios).mockReturnValue({ data: MENTORES, isPending: false, isError: false } as unknown as R<
    typeof useUsuarios
  >);
  vi.mocked(useAtualizarEquipe).mockReturnValue({ mutate: atualizarEquipe, isPending: false } as unknown as R<
    typeof useAtualizarEquipe
  >);
  vi.mocked(useEnviarLembrete).mockReturnValue({ mutate: enviarLembrete, isPending: false } as unknown as R<
    typeof useEnviarLembrete
  >);
}

function comoAdmin() {
  vi.mocked(useUsuario).mockReturnValue({ slug: 'admin', nome: 'Coord Admin', role: 'admin' } as R<typeof useUsuario>);
}
function comoMentor(slug = 'mentor-ana') {
  vi.mocked(useUsuario).mockReturnValue({ slug, nome: 'Mentor', role: 'mentor' } as R<typeof useUsuario>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPadrao();
  comoAdmin();
});

describe('DetalheEquipe — ideia e membros', () => {
  it('mostra cabeçalho, ideia e membros com papel, curso/semestre e convite pendente', () => {
    render(<DetalheEquipe slug="agrosmart" />);

    expect(screen.getByRole('heading', { name: 'AgroSmart' })).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText('3. Encontro 1')).toBeInTheDocument();
    expect(screen.getByText('Ana Mentora')).toBeInTheDocument();
    expect(screen.getByText('Sensores de umidade para pequenas lavouras.')).toBeInTheDocument();
    expect(screen.getByText('Agronegócio')).toBeInTheDocument();
    expect(screen.getByText('Protótipo')).toBeInTheDocument();
    expect(screen.getByText('2026/2')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();

    const lia = screen.getByTestId('membro-lia');
    expect(lia).toHaveTextContent('Líder');
    expect(lia).toHaveTextContent('Direito · 3º');
    expect(lia).not.toHaveTextContent('convite pendente');

    // semestre que já vem com "º" não duplica
    expect(screen.getByTestId('membro-caio')).toHaveTextContent('Agronomia · 5º');
    expect(screen.getByTestId('membro-caio')).not.toHaveTextContent('5ºº');

    expect(screen.getByTestId('membro-bia')).toHaveTextContent('convite pendente');
  });

  it('carregando mostra "Carregando…"', () => {
    vi.mocked(useEquipe).mockReturnValue({ isPending: true, isError: false } as unknown as R<typeof useEquipe>);
    render(<DetalheEquipe slug="agrosmart" />);
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('erro da API mostra a mensagem e "Tentar de novo" chama refetch', async () => {
    const user = userEvent.setup();
    vi.mocked(useEquipe).mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError(500, 'X', 'Servidor fora do ar'),
      refetch,
    } as unknown as R<typeof useEquipe>);
    render(<DetalheEquipe slug="agrosmart" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Servidor fora do ar');
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('404 mostra "Equipe não encontrada"', () => {
    vi.mocked(useEquipe).mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError(404, 'NAO_ENCONTRADO', 'Equipe não encontrada.'),
      refetch,
    } as unknown as R<typeof useEquipe>);
    render(<DetalheEquipe slug="nada" />);
    expect(screen.getByText('Equipe não encontrada')).toBeInTheDocument();
  });

  it('"Gerar link" só aparece no membro pendente e chama useGerarConvite().mutate(slug), mostrando o link para copiar', async () => {
    const user = userEvent.setup();
    gerar.mockImplementation((_slug: string, opts?: { onSuccess?: (r: unknown) => void }) =>
      opts?.onSuccess?.({ conviteUrl: 'https://infohub/convite?token=xyz', expiraEm: '2026-09-25T15:00:00Z' }),
    );
    render(<DetalheEquipe slug="agrosmart" />);

    expect(screen.getAllByRole('button', { name: /gerar link/i })).toHaveLength(1);
    const bia = screen.getByTestId('membro-bia');
    await user.click(within(bia).getByRole('button', { name: /gerar link/i }));

    expect(useGerarConvite).toHaveBeenCalledWith('agrosmart');
    expect(gerar).toHaveBeenCalledWith('bia', expect.anything());
    expect(within(bia).getByDisplayValue('https://infohub/convite?token=xyz')).toBeInTheDocument();
    expect(within(bia).getByRole('button', { name: /^copiar$/i })).toBeInTheDocument();
  });

  it('erro ao gerar link aparece como alerta', async () => {
    const user = userEvent.setup();
    gerar.mockImplementation((_slug: string, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(new ApiError(403, 'PROIBIDO', 'Sem permissão para esta equipe.')),
    );
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('button', { name: /gerar link/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Sem permissão para esta equipe.');
  });

  it('mentor de outra equipe não vê gerir membros nem mover etapa', () => {
    comoMentor('outro-mentor');
    render(<DetalheEquipe slug="agrosmart" />);
    expect(screen.queryByRole('button', { name: /gerar link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /adicionar integrante/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /avançar etapa/i })).not.toBeInTheDocument();
  });

  it('o mentor da equipe gere membros e move a etapa', () => {
    comoMentor('mentor-ana');
    render(<DetalheEquipe slug="agrosmart" />);
    expect(screen.getByRole('button', { name: /gerar link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adicionar integrante/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /avançar etapa/i })).toBeInTheDocument();
  });
});

describe('AdicionarMembroDialog', () => {
  async function abrirEPreencher(nome: string, email: string) {
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('button', { name: /adicionar integrante/i }));
    const dialog = screen.getByRole('dialog');
    if (nome) await user.type(within(dialog).getByLabelText('Nome'), nome);
    if (email) await user.type(within(dialog).getByLabelText('E-mail'), email);
    await user.click(within(dialog).getByRole('button', { name: /^adicionar$/i }));
    return dialog;
  }

  it('envia { nome, email } e mostra o link de convite para copiar', async () => {
    adicionar.mockImplementation((_b: unknown, opts?: { onSuccess?: (r: unknown) => void }) =>
      opts?.onSuccess?.({
        slug: 'davi',
        nome: 'Davi Novo',
        email: 'davi@amf.edu.br',
        conviteUrl: 'https://infohub/convite?token=novo',
        pendente: true,
      }),
    );
    const dialog = await abrirEPreencher('Davi Novo', 'davi@amf.edu.br');

    expect(useAdicionarMembro).toHaveBeenCalledWith('agrosmart');
    expect(adicionar).toHaveBeenCalledWith({ nome: 'Davi Novo', email: 'davi@amf.edu.br' }, expect.anything());
    expect(within(dialog).getByDisplayValue('https://infohub/convite?token=novo')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^copiar$/i })).toBeInTheDocument();
  });

  it('quem já tem conta entra direto: "já tem conta — adicionado"', async () => {
    adicionar.mockImplementation((_b: unknown, opts?: { onSuccess?: (r: unknown) => void }) =>
      opts?.onSuccess?.({ slug: 'eva', nome: 'Eva Antiga', email: 'eva@amf.edu.br', conviteUrl: null, pendente: false }),
    );
    const dialog = await abrirEPreencher('Eva Antiga', 'eva@amf.edu.br');
    expect(within(dialog).getByText(/já tem conta — adicionado/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /^copiar$/i })).not.toBeInTheDocument();
  });

  it('409 mostra a mensagem da API', async () => {
    adicionar.mockImplementation((_b: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(new ApiError(409, 'JA_E_MEMBRO', 'Essa pessoa já está nesta equipe.')),
    );
    const dialog = await abrirEPreencher('Lia Líder', 'lia@amf.edu.br');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Essa pessoa já está nesta equipe.');
  });

  it('sem e-mail válido não envia', async () => {
    const dialog = await abrirEPreencher('Fulano', 'fulano-sem-arroba');
    expect(adicionar).not.toHaveBeenCalled();
    expect(within(dialog).getByText('E-mail inválido.')).toBeInTheDocument();
  });
});

describe('Linha do tempo', () => {
  it('a aba mostra os eventos da API com detalhe, autor e data', async () => {
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('tab', { name: 'Linha do tempo' }));

    expect(useLinhaDoTempo).toHaveBeenCalledWith('agrosmart');
    const itens = within(screen.getByRole('list', { name: 'Linha do tempo' })).getAllByRole('listitem');
    expect(itens[0]).toHaveTextContent('Etapa 6 → Pronta p/ InovAMF (forçado)');
    expect(itens[0]).toHaveTextContent('Banca antecipada');
    expect(itens[0]).toHaveTextContent('Coord Admin');
    expect(itens[0]).toHaveTextContent('10/09/2026');
    expect(itens[1]).toHaveTextContent('Entrega aprovada: Pitch');
  });
});

describe('AnotacoesInternas', () => {
  it('lista as anotações (mais recentes primeiro) com autor e aviso de visibilidade', async () => {
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('tab', { name: 'Anotações' }));

    expect(useAnotacoes).toHaveBeenCalledWith('agrosmart');
    expect(screen.getByText('Visível só para a coordenação e o mentor.')).toBeInTheDocument();
    const itens = screen.getAllByRole('listitem');
    expect(itens[0]).toHaveTextContent('Encontro produtivo');
    expect(itens[0]).toHaveTextContent('Coord Admin');
    expect(itens[1]).toHaveTextContent('Primeira conversa');
    expect(itens[1]).toHaveTextContent('Ana Mentora');
  });

  it('publica uma anotação com useAnotar().mutate(conteudo)', async () => {
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('tab', { name: 'Anotações' }));
    await user.type(screen.getByLabelText('Nova anotação'), '  Pediram ajuda com o pitch  ');
    await user.click(screen.getByRole('button', { name: /adicionar anotação/i }));
    expect(useAnotar).toHaveBeenCalledWith('agrosmart');
    expect(anotar).toHaveBeenCalledWith('Pediram ajuda com o pitch', expect.anything());
  });

  it('erro ao listar mostra alerta com "Tentar de novo"', async () => {
    const refetchAnot = vi.fn();
    vi.mocked(useAnotacoes).mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError(500, 'X', 'Falha nas anotações'),
      refetch: refetchAnot,
    } as unknown as R<typeof useAnotacoes>);
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('tab', { name: 'Anotações' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Falha nas anotações');
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(refetchAnot).toHaveBeenCalled();
  });
});

describe('AvancarEtapa', () => {
  it('sem pendências: "Avançar etapa" envia { etapa: próxima }', async () => {
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('button', { name: /avançar etapa/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('3. Etapa 3');
    expect(dialog).toHaveTextContent('4. Etapa 4');
    await user.click(within(dialog).getByTestId('confirmar-movimento'));
    expect(mover).toHaveBeenCalledWith({ etapa: 4 }, expect.anything());
  });

  it('com pendências: lista-as, vira "Forçar avanço" e exige observação', async () => {
    mockEquipe(
      detalhe({
        pendenciasParaAvancar: [
          { tipo: 'tarefa', slug: 't1', titulo: 'Canvas do modelo de negócio' },
          { tipo: 'integrante', slug: 'bia', nome: 'Bia Pendente', motivo: 'convite_pendente' },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);

    const pend = screen.getByTestId('pendencias-avancar');
    expect(pend).toHaveTextContent('tarefa: Canvas do modelo de negócio');
    expect(pend).toHaveTextContent('integrante: Bia Pendente — convite pendente');
    expect(screen.queryByRole('button', { name: /avançar etapa/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /forçar avanço/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByTestId('confirmar-movimento'));
    expect(mover).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/explique o motivo/i)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Observação'), 'Mentor validou em reunião');
    await user.click(within(dialog).getByTestId('confirmar-movimento'));
    expect(mover).toHaveBeenCalledWith(
      { etapa: 4, forcado: true, observacao: 'Mentor validou em reunião' },
      expect.anything(),
    );
  });

  it('409 RN01_PENDENCIAS passa o diálogo para o modo forçar com as pendências da API', async () => {
    mover.mockImplementationOnce((_b: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(
        new ApiError(409, 'RN01_PENDENCIAS', 'Há pendências para avançar.', {
          pendencias: [{ tipo: 'tarefa', slug: 't9', titulo: 'Pitch gravado' }],
        }),
      ),
    );
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('button', { name: /avançar etapa/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByTestId('confirmar-movimento'));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Há pendências para avançar.');
    expect(within(dialog).getByTestId('pendencias-mover')).toHaveTextContent('tarefa: Pitch gravado');
    expect(within(dialog).getByLabelText('Observação')).toBeInTheDocument();
  });

  it('na etapa 6 oferece "Marcar como pronta" → { etapa: "pronta" }', async () => {
    mockEquipe(detalhe({ etapa: { numero: 6, nome: 'Encontro 4' } }));
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('button', { name: /marcar como pronta/i }));
    await user.click(within(screen.getByRole('dialog')).getByTestId('confirmar-movimento'));
    expect(mover).toHaveBeenCalledWith({ etapa: 'pronta' }, expect.anything());
  });

  it('equipe pronta não tem avançar; "Retroceder" volta para a etapa 6', async () => {
    mockEquipe(detalhe({ etapa: { numero: 6, nome: 'Encontro 4' }, status: 'pronta_inovamf' }));
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    expect(screen.queryByRole('button', { name: /avançar|marcar como pronta/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retroceder/i }));
    await user.click(within(screen.getByRole('dialog')).getByTestId('confirmar-movimento'));
    expect(mover).toHaveBeenCalledWith({ etapa: 6 }, expect.anything());
  });

  it('na etapa 1 não há "Retroceder"', () => {
    mockEquipe(detalhe({ etapa: { numero: 1, nome: 'Envio da ideia' } }));
    render(<DetalheEquipe slug="agrosmart" />);
    expect(screen.queryByRole('button', { name: /retroceder/i })).not.toBeInTheDocument();
  });

  it('409 RN02_PENDENCIAS também vira "forçar", listando o entregável ausente', async () => {
    mover.mockImplementationOnce((_b: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(
        new ApiError(409, 'RN02_PENDENCIAS', 'Faltam entregáveis finais ou dados de integrantes', {
          pendencias: [{ tipo: 'entregavel', titulo: 'Pitch vídeo' }],
        }),
      ),
    );
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('button', { name: /avançar etapa/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByTestId('confirmar-movimento'));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Faltam entregáveis finais');
    expect(within(dialog).getByTestId('pendencias-mover')).toHaveTextContent('entregável não criado: Pitch vídeo');
    expect(within(dialog).getByLabelText('Observação')).toBeInTheDocument();
  });
});

describe('Gestão da equipe (A1)', () => {
  async function abrirGestao() {
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('tab', { name: 'Gestão' }));
    return user;
  }

  it('só o admin vê a aba Gestão', () => {
    comoMentor();
    render(<DetalheEquipe slug="agrosmart" />);
    expect(screen.queryByRole('tab', { name: 'Gestão' })).not.toBeInTheDocument();
  });

  it('lista só mentores ativos e troca o mentor com { mentor: slug }', async () => {
    const user = await abrirGestao();
    const select = screen.getByLabelText('Mentor');
    expect(within(select).queryByRole('option', { name: 'Inativo Mentor' })).not.toBeInTheDocument();
    await user.selectOptions(select, 'mentor-bruno');
    expect(useAtualizarEquipe).toHaveBeenCalledWith('agrosmart');
    expect(atualizarEquipe).toHaveBeenCalledWith({ mentor: 'mentor-bruno' }, expect.anything());
  });

  it('"Sem mentor" envia { mentor: null }', async () => {
    const user = await abrirGestao();
    await user.selectOptions(screen.getByLabelText('Mentor'), '');
    expect(atualizarEquipe).toHaveBeenCalledWith({ mentor: null }, expect.anything());
  });

  it('status manda { status } e o 409 da API aparece inline', async () => {
    atualizarEquipe.mockImplementationOnce((_b: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(
        new ApiError(409, 'TRANSICAO_INVALIDA', 'Só dá para encaminhar ao InovAMF uma equipe que está Pronta p/ InovAMF'),
      ),
    );
    const user = await abrirGestao();
    await user.selectOptions(screen.getByLabelText('Status'), 'encaminhada_inovamf');
    expect(atualizarEquipe).toHaveBeenCalledWith({ status: 'encaminhada_inovamf' }, expect.anything());
    expect(screen.getByRole('alert')).toHaveTextContent('Só dá para encaminhar ao InovAMF');
  });
});

describe('Enviar lembrete (RF-20)', () => {
  it('envia a mensagem opcional, com teto de 500 caracteres', async () => {
    const user = userEvent.setup();
    render(<DetalheEquipe slug="agrosmart" />);
    await user.click(screen.getByRole('button', { name: /enviar lembrete/i }));
    const dialog = screen.getByRole('dialog');
    const campo = within(dialog).getByLabelText('Mensagem (opcional)');
    expect(campo).toHaveAttribute('maxlength', '500');
    await user.type(campo, 'Pitch na sexta');
    await user.click(within(dialog).getByRole('button', { name: /^enviar$/i }));
    expect(useEnviarLembrete).toHaveBeenCalledWith('agrosmart');
    expect(enviarLembrete).toHaveBeenCalledWith({ mensagem: 'Pitch na sexta' }, expect.anything());
  });

  it('mentor de outra equipe não vê o botão', () => {
    comoMentor('outro-mentor');
    render(<DetalheEquipe slug="agrosmart" />);
    expect(screen.queryByRole('button', { name: /enviar lembrete/i })).not.toBeInTheDocument();
  });
});
