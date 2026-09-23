import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/data/api/consultas', () => ({
  useUsuarios: vi.fn(),
  useCriarUsuario: vi.fn(),
  useEditarUsuario: vi.fn(),
  useReenviarConvite: vi.fn(),
  useGerarRedefinicao: vi.fn(),
  useMe: vi.fn(),
  useAtualizarMe: vi.fn(),
  useTrocarSenha: vi.fn(),
}));

vi.mock('@/data/api/useSessao', () => ({ useUsuario: vi.fn(() => null) }));

import {
  useAtualizarMe,
  useCriarUsuario,
  useEditarUsuario,
  useGerarRedefinicao,
  useMe,
  useReenviarConvite,
  useTrocarSenha,
  useUsuarios,
} from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import { useUsuario } from '@/data/api/useSessao';
import type { Me, UsuarioAdmin } from '@/data/api/tipos';
import { ContasAdmin } from '@/features/admin-contas/ContasAdmin';
import { ContaPerfil } from '@/features/conta/ContaPerfil';
import { ToastProvider } from '@/design-system/components/Toast';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const USUARIOS: UsuarioAdmin[] = [
  {
    slug: 'admin-1',
    nome: 'Ana Admin',
    email: 'ana@infohub.dev',
    telefone: '(55) 90000-1111',
    role: 'admin',
    ativo: true,
    conviteAceito: true,
  },
  {
    slug: 'mentor-1',
    nome: 'Marina Mentora',
    email: 'marina@infohub.dev',
    telefone: '(55) 90000-2222',
    role: 'mentor',
    ativo: true,
    conviteAceito: false,
  },
  {
    slug: 'aluno-1',
    nome: 'Caio Aluno',
    email: 'caio@infohub.dev',
    telefone: '(55) 90000-3333',
    role: 'aluno',
    ativo: true,
    conviteAceito: true,
    curso: 'Engenharia de Software',
    semestre: '3º',
    equipe: { slug: 'equipe-agro', nomeIdeia: 'AgroTech' },
  },
];

const criar = vi.fn();
const editar = vi.fn();
const reenviar = vi.fn();
const gerarRedefinicao = vi.fn();
const refetchUsuarios = vi.fn();

function mockUsuarios(data: UsuarioAdmin[] = USUARIOS) {
  vi.mocked(useUsuarios).mockReturnValue({
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: refetchUsuarios,
  } as unknown as R<typeof useUsuarios>);
}

function mockPadraoAdmin() {
  mockUsuarios();
  vi.mocked(useCriarUsuario).mockReturnValue({
    mutate: criar,
    isPending: false,
  } as unknown as R<typeof useCriarUsuario>);
  vi.mocked(useEditarUsuario).mockReturnValue({
    mutate: editar,
    isPending: false,
    variables: undefined,
  } as unknown as R<typeof useEditarUsuario>);
  vi.mocked(useReenviarConvite).mockReturnValue({
    mutate: reenviar,
    isPending: false,
  } as unknown as R<typeof useReenviarConvite>);
}

const ME: Me = {
  slug: 'admin-1',
  nome: 'Ana Admin',
  email: 'ana@infohub.dev',
  telefone: '(55) 90000-1111',
  role: 'admin',
  criadoEm: '2026-01-01T00:00:00Z',
  ultimoLoginEm: null,
};

const atualizarMe = vi.fn();
const trocarSenha = vi.fn();
const refetchMe = vi.fn();

function mockPadraoConta() {
  vi.mocked(useMe).mockReturnValue({
    data: ME,
    isPending: false,
    isError: false,
    error: null,
    refetch: refetchMe,
  } as unknown as R<typeof useMe>);
  vi.mocked(useAtualizarMe).mockReturnValue({
    mutate: atualizarMe,
    isPending: false,
  } as unknown as R<typeof useAtualizarMe>);
  vi.mocked(useTrocarSenha).mockReturnValue({
    mutate: trocarSenha,
    isPending: false,
  } as unknown as R<typeof useTrocarSenha>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGerarRedefinicao).mockReturnValue({
    mutate: gerarRedefinicao,
    isPending: false,
  } as unknown as R<typeof useGerarRedefinicao>);
});

describe('ContasAdmin', () => {
  it('lista contas de admin, mentor e aluno, e mostra badge de convite pendente', () => {
    mockPadraoAdmin();
    render(<ContasAdmin />);

    expect(screen.getByText('Ana Admin')).toBeInTheDocument();
    expect(screen.getByText('Marina Mentora')).toBeInTheDocument();
    expect(screen.getByText('Caio Aluno')).toBeInTheDocument();

    const linhaMarina = screen.getByText('Marina Mentora').closest('li')!;
    expect(within(linhaMarina).getByText(/convite pendente/i)).toBeInTheDocument();

    const linhaAna = screen.getByText('Ana Admin').closest('li')!;
    expect(within(linhaAna).queryByText(/convite pendente/i)).not.toBeInTheDocument();

    expect(screen.getByText('3 contas')).toBeInTheDocument();
  });

  it('mostra discretamente curso, semestre e equipe na linha do aluno', () => {
    mockPadraoAdmin();
    render(<ContasAdmin />);

    const linha = screen.getByText('Caio Aluno').closest('li')!;
    expect(within(linha).getByText(/Engenharia de Software/)).toBeInTheDocument();
    expect(within(linha).getByText(/3º/)).toBeInTheDocument();
    expect(within(linha).getByText(/AgroTech/)).toBeInTheDocument();
  });

  it('busca filtra por nome, e-mail, curso e semestre (aceita dígitos), sem diferenciar acentos', async () => {
    mockPadraoAdmin();
    const user = userEvent.setup();
    render(<ContasAdmin />);

    const busca = screen.getByLabelText('Buscar contas');

    await user.type(busca, 'marina');
    expect(screen.getByText('Marina Mentora')).toBeInTheDocument();
    expect(screen.queryByText('Ana Admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Caio Aluno')).not.toBeInTheDocument();

    await user.clear(busca);
    await user.type(busca, 'caio@infohub.dev');
    expect(screen.getByText('Caio Aluno')).toBeInTheDocument();
    expect(screen.queryByText('Marina Mentora')).not.toBeInTheDocument();

    await user.clear(busca);
    await user.type(busca, 'engenharia');
    expect(screen.getByText('Caio Aluno')).toBeInTheDocument();

    await user.clear(busca);
    await user.type(busca, '3');
    expect(screen.getByText('Caio Aluno')).toBeInTheDocument();

    await user.clear(busca);
    await user.type(busca, 'MARÍNA');
    expect(screen.getByText('Marina Mentora')).toBeInTheDocument();
  });

  it('busca sem resultado mostra o estado vazio com o termo', async () => {
    mockPadraoAdmin();
    const user = userEvent.setup();
    render(<ContasAdmin />);

    await user.type(screen.getByLabelText('Buscar contas'), 'ninguém tem esse nome');
    expect(screen.getByText('Nenhuma conta encontrada para "ninguém tem esse nome"')).toBeInTheDocument();
  });

  it('os chips de papel filtram a lista', async () => {
    mockPadraoAdmin();
    const user = userEvent.setup();
    render(<ContasAdmin />);

    await user.click(screen.getByRole('button', { name: 'Alunos' }));
    expect(screen.getByText('Caio Aluno')).toBeInTheDocument();
    expect(screen.queryByText('Ana Admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Marina Mentora')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alunos' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Administradores' }));
    expect(screen.getByText('Ana Admin')).toBeInTheDocument();
    expect(screen.queryByText('Caio Aluno')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByText('Ana Admin')).toBeInTheDocument();
    expect(screen.getByText('Marina Mentora')).toBeInTheDocument();
    expect(screen.getByText('Caio Aluno')).toBeInTheDocument();
  });

  it('cria uma nova conta com o corpo exato e mostra o link de convite', async () => {
    mockPadraoAdmin();
    criar.mockImplementation((_body, opts) => {
      opts?.onSuccess?.({
        slug: 'novo-mentor',
        nome: 'Paulo Mentor',
        email: 'paulo@infohub.dev',
        telefone: '(55) 90000-4444',
        role: 'mentor',
        conviteUrl: 'https://infohub.dev/convite/abc123',
      });
    });

    const user = userEvent.setup();
    render(<ContasAdmin />);

    await user.click(screen.getByRole('button', { name: /nova conta/i }));
    await user.type(screen.getByLabelText('Nome'), 'Paulo Mentor');
    await user.type(screen.getByLabelText('E-mail'), 'paulo@infohub.dev');
    await user.type(screen.getByLabelText('Telefone'), '(55) 90000-4444');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(criar).toHaveBeenCalledWith(
      {
        nome: 'Paulo Mentor',
        email: 'paulo@infohub.dev',
        telefone: '(55) 90000-4444',
        tipo: 'mentor',
      },
      expect.anything(),
    );
    expect(screen.getByText(/envie este link/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://infohub.dev/convite/abc123')).toBeInTheDocument();
  });

  it('não tem campo de senha ao criar conta', async () => {
    mockPadraoAdmin();
    const user = userEvent.setup();
    render(<ContasAdmin />);

    await user.click(screen.getByRole('button', { name: /nova conta/i }));
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
  });

  it('edita uma conta chamando useEditarUsuario com o slug e os campos certos', async () => {
    mockPadraoAdmin();
    const user = userEvent.setup();
    render(<ContasAdmin />);

    const linha = screen.getByText('Marina Mentora').closest('li')!;
    await user.click(within(linha).getByRole('button', { name: /editar/i }));

    const nome = screen.getByLabelText('Nome');
    await user.clear(nome);
    await user.type(nome, 'Marina Editada');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(editar).toHaveBeenCalledWith(
      {
        slug: 'mentor-1',
        nome: 'Marina Editada',
        telefone: '(55) 90000-2222',
        tipo: 'mentor',
      },
      expect.anything(),
    );
  });

  it('ativa/desativa uma conta chamando useEditarUsuario com { slug, ativo }', async () => {
    mockPadraoAdmin();
    const user = userEvent.setup();
    render(<ContasAdmin />);

    const linha = screen.getByText('Ana Admin').closest('li')!;
    await user.click(within(linha).getByRole('button', { name: /desativar/i }));

    expect(editar).toHaveBeenCalledWith({ slug: 'admin-1', ativo: false }, expect.anything());
  });

  it('na própria linha não há "Desativar" e o próprio perfil fica travado', async () => {
    mockPadraoAdmin();
    vi.mocked(useUsuario).mockReturnValue({ slug: 'admin-1', nome: 'Ana Admin', role: 'admin' });
    const user = userEvent.setup();
    render(<ContasAdmin />);

    const minha = screen.getByText('Ana Admin').closest('li') as HTMLElement;
    expect(within(minha).queryByRole('button', { name: /desativar/i })).not.toBeInTheDocument();
    const outra = screen.getByText('Marina Mentora').closest('li') as HTMLElement;
    expect(within(outra).getByRole('button', { name: /desativar/i })).toBeInTheDocument();

    await user.click(within(minha).getByRole('button', { name: /editar/i }));
    expect(screen.getByLabelText('Perfil')).toBeDisabled();
    expect(screen.getByText('Você não pode mudar o próprio perfil.')).toBeInTheDocument();
    vi.mocked(useUsuario).mockReturnValue(null);
  });

  it('mostra alerta de erro quando ativar/desativar falha', async () => {
    mockPadraoAdmin();
    editar.mockImplementation((_body, opts) => {
      opts?.onError?.(new ApiError(500, 'ERRO_INTERNO', 'Não foi possível atualizar a conta.'));
    });

    const user = userEvent.setup();
    render(<ContasAdmin />);

    const linha = screen.getByText('Ana Admin').closest('li')!;
    await user.click(within(linha).getByRole('button', { name: /desativar/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível atualizar a conta.');
  });

  it('"Novo link" chama useReenviarConvite e mostra o link retornado', async () => {
    mockPadraoAdmin();
    reenviar.mockImplementation((_slug, opts) => {
      opts?.onSuccess?.({ conviteUrl: 'https://infohub.dev/convite/xyz789' });
    });

    const user = userEvent.setup();
    render(<ContasAdmin />);

    const linha = screen.getByText('Marina Mentora').closest('li')!;
    await user.click(within(linha).getByRole('button', { name: /novo link/i }));

    expect(reenviar).toHaveBeenCalledWith('mentor-1', expect.anything());
    expect(within(linha).getByDisplayValue('https://infohub.dev/convite/xyz789')).toBeInTheDocument();
  });

  it('mostra alerta de erro quando gerar novo link falha', async () => {
    mockPadraoAdmin();
    reenviar.mockImplementation((_slug, opts) => {
      opts?.onError?.(new ApiError(500, 'ERRO_INTERNO', 'Não foi possível gerar o link.'));
    });

    const user = userEvent.setup();
    render(<ContasAdmin />);

    const linha = screen.getByText('Marina Mentora').closest('li')!;
    await user.click(within(linha).getByRole('button', { name: /novo link/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível gerar o link.');
  });

  it('mostra estado de erro com "Tentar de novo" chamando refetch', async () => {
    mockUsuarios();
    vi.mocked(useUsuarios).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError(500, 'ERRO_INTERNO', 'Não foi possível carregar as contas.'),
      refetch: refetchUsuarios,
    } as unknown as R<typeof useUsuarios>);
    vi.mocked(useCriarUsuario).mockReturnValue({
      mutate: criar,
      isPending: false,
    } as unknown as R<typeof useCriarUsuario>);
    vi.mocked(useEditarUsuario).mockReturnValue({
      mutate: editar,
      isPending: false,
      variables: undefined,
    } as unknown as R<typeof useEditarUsuario>);
    vi.mocked(useReenviarConvite).mockReturnValue({
      mutate: reenviar,
      isPending: false,
    } as unknown as R<typeof useReenviarConvite>);

    const user = userEvent.setup();
    render(<ContasAdmin />);

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as contas.');
    const botao = screen.getByRole('button', { name: /tentar de novo/i });
    await user.click(botao);

    expect(refetchUsuarios).toHaveBeenCalled();
  });

  it('o botão de redefinir não existe mais na linha da conta', () => {
    mockPadraoAdmin();
    render(<ContasAdmin />);
    expect(screen.queryByRole('button', { name: /redefinir senha/i })).not.toBeInTheDocument();
  });

  it('"Gerar link de redefinição" fica dentro do diálogo Editar, na seção Acesso', async () => {
    mockPadraoAdmin();
    gerarRedefinicao.mockImplementationOnce((_slug: unknown, opts?: { onSuccess?: (r: unknown) => void }) =>
      opts?.onSuccess?.({ link: '/redefinir-senha?token=abc.def', expiraEm: '2026-09-23T12:00:00Z' }),
    );
    const user = userEvent.setup();
    render(<ContasAdmin />);

    // Marina não aceitou o convite ainda: o botão fica desabilitado com uma dica.
    const linhaMarina = screen.getByText('Marina Mentora').closest('li')!;
    await user.click(within(linhaMarina).getByRole('button', { name: /editar/i }));
    expect(screen.getByText('Acesso')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerar link de redefinição/i })).not.toBeInTheDocument();
    expect(screen.getByText(/disponível só para conta ativa com convite aceito/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    // Ana está ativa e já aceitou: o botão funciona e mostra o link.
    const linhaAna = screen.getByText('Ana Admin').closest('li')!;
    await user.click(within(linhaAna).getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /gerar link de redefinição/i }));
    expect(gerarRedefinicao).toHaveBeenCalledWith('admin-1', expect.anything());
    expect(screen.getByDisplayValue(/\/redefinir-senha\?token=abc\.def$/)).toBeInTheDocument();
  });

  it('erro ao gerar o link de redefinição aparece inline no diálogo', async () => {
    mockPadraoAdmin();
    gerarRedefinicao.mockImplementationOnce((_slug: unknown, opts?: { onError?: (e: unknown) => void }) =>
      opts?.onError?.(new ApiError(409, 'CONVITE_PENDENTE', 'A pessoa ainda não aceitou o convite')),
    );
    const user = userEvent.setup();
    render(<ContasAdmin />);
    const linhaAna = screen.getByText('Ana Admin').closest('li')!;
    await user.click(within(linhaAna).getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /gerar link de redefinição/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('A pessoa ainda não aceitou o convite');
  });

  it('diálogo Editar de aluno não tem o campo Perfil e tem "Gerar link de redefinição"', async () => {
    mockPadraoAdmin();
    const user = userEvent.setup();
    render(<ContasAdmin />);

    const linhaCaio = screen.getByText('Caio Aluno').closest('li')!;
    await user.click(within(linhaCaio).getByRole('button', { name: /editar/i }));

    expect(screen.getByLabelText('Nome')).toHaveValue('Caio Aluno');
    expect(screen.getByLabelText('Telefone')).toHaveValue('(55) 90000-3333');
    expect(screen.queryByLabelText('Perfil')).not.toBeInTheDocument();
    expect(screen.getByText('Acesso')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gerar link de redefinição/i })).toBeInTheDocument();
  });

  it('edita um aluno sem mandar `tipo` no corpo (perfil de aluno é fixo)', async () => {
    mockPadraoAdmin();
    const user = userEvent.setup();
    render(<ContasAdmin />);

    const linhaCaio = screen.getByText('Caio Aluno').closest('li')!;
    await user.click(within(linhaCaio).getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(editar).toHaveBeenCalledWith(
      { slug: 'aluno-1', nome: 'Caio Aluno', telefone: '(55) 90000-3333' },
      expect.anything(),
    );
  });
});

describe('ContaPerfil', () => {
  it('preenche nome/telefone a partir de useMe e envia o corpo certo ao salvar', async () => {
    mockPadraoConta();
    const user = userEvent.setup();
    render(<ContaPerfil />);

    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Admin');
    expect(screen.getByLabelText('Telefone')).toHaveValue('(55) 90000-1111');
    expect(screen.getByText('ana@infohub.dev')).toBeInTheDocument();

    const nome = screen.getByLabelText('Nome');
    await user.clear(nome);
    await user.type(nome, 'Ana Editada');
    await user.click(screen.getByRole('button', { name: /salvar dados/i }));

    expect(atualizarMe).toHaveBeenCalledWith(
      { nome: 'Ana Editada', telefone: '(55) 90000-1111' },
      expect.anything(),
    );
  });

  it('campos de senha usam PasswordInput (botão de olho presente)', () => {
    mockPadraoConta();
    render(<ContaPerfil />);

    expect(screen.getAllByLabelText(/mostrar senha enquanto pressionado/i)).toHaveLength(3);
  });

  it('bloqueia envio sem senha atual, nova ou confirmação', async () => {
    mockPadraoConta();
    const user = userEvent.setup();
    render(<ContaPerfil />);

    await user.click(screen.getByRole('button', { name: /alterar senha/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/senha atual/i);
    expect(trocarSenha).not.toHaveBeenCalled();
  });

  it('bloqueia quando nova senha e confirmação não conferem', async () => {
    mockPadraoConta();
    const user = userEvent.setup();
    render(<ContaPerfil />);

    await user.type(screen.getByLabelText('Senha atual'), 'senhaAtual1');
    await user.type(screen.getByLabelText('Nova senha'), 'novaSenha123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'diferente123');
    await user.click(screen.getByRole('button', { name: /alterar senha/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/não conferem/i);
    expect(trocarSenha).not.toHaveBeenCalled();
  });

  it('envia { atual, nova } quando os campos são válidos', async () => {
    mockPadraoConta();
    const user = userEvent.setup();
    render(<ContaPerfil />);

    await user.type(screen.getByLabelText('Senha atual'), 'senhaAtual1');
    await user.type(screen.getByLabelText('Nova senha'), 'novaSenha123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'novaSenha123');
    await user.click(screen.getByRole('button', { name: /alterar senha/i }));

    expect(trocarSenha).toHaveBeenCalledWith(
      { atual: 'senhaAtual1', nova: 'novaSenha123' },
      expect.anything(),
    );
  });

  it('mapeia o erro SENHA_ATUAL_INVALIDA para "Senha atual incorreta"', async () => {
    mockPadraoConta();
    trocarSenha.mockImplementation((_body, opts) => {
      opts?.onError?.(new ApiError(401, 'SENHA_ATUAL_INVALIDA', 'Senha atual inválida.'));
    });

    const user = userEvent.setup();
    render(<ContaPerfil />);

    await user.type(screen.getByLabelText('Senha atual'), 'senhaErrada');
    await user.type(screen.getByLabelText('Nova senha'), 'novaSenha123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'novaSenha123');
    await user.click(screen.getByRole('button', { name: /alterar senha/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/senha atual incorreta/i);
  });

  it('mostra estado de erro com "Tentar de novo" chamando refetch', async () => {
    vi.mocked(useMe).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError(500, 'ERRO_INTERNO', 'Não foi possível carregar seus dados.'),
      refetch: refetchMe,
    } as unknown as R<typeof useMe>);
    vi.mocked(useAtualizarMe).mockReturnValue({
      mutate: atualizarMe,
      isPending: false,
    } as unknown as R<typeof useAtualizarMe>);
    vi.mocked(useTrocarSenha).mockReturnValue({
      mutate: trocarSenha,
      isPending: false,
    } as unknown as R<typeof useTrocarSenha>);

    const user = userEvent.setup();
    render(<ContaPerfil />);

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar seus dados.');
    const botao = screen.getByRole('button', { name: /tentar de novo/i });
    await user.click(botao);

    expect(refetchMe).toHaveBeenCalled();
  });

  it('salvar dados confirma com toast (sucesso não vira alerta)', async () => {
    mockPadraoConta();
    atualizarMe.mockImplementationOnce((_b: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ContaPerfil />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: /salvar dados/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Dados atualizados.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
