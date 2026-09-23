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
  useMe: vi.fn(),
  useAtualizarMe: vi.fn(),
  useTrocarSenha: vi.fn(),
}));

import {
  useAtualizarMe,
  useCriarUsuario,
  useEditarUsuario,
  useMe,
  useReenviarConvite,
  useTrocarSenha,
  useUsuarios,
} from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import type { Me, UsuarioAdmin } from '@/data/api/tipos';
import { ContasAdmin } from '@/features/admin-contas/ContasAdmin';
import { ContaPerfil } from '@/features/conta/ContaPerfil';

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
  },
];

const criar = vi.fn();
const editar = vi.fn();
const reenviar = vi.fn();
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
});

describe('ContasAdmin', () => {
  it('lista contas de admin e mentor, ignora alunos, e mostra badge de convite pendente', () => {
    mockPadraoAdmin();
    render(<ContasAdmin />);

    expect(screen.getByText('Ana Admin')).toBeInTheDocument();
    expect(screen.getByText('Marina Mentora')).toBeInTheDocument();
    expect(screen.queryByText('Caio Aluno')).not.toBeInTheDocument();

    const linhaMarina = screen.getByText('Marina Mentora').closest('li')!;
    expect(within(linhaMarina).getByText(/convite pendente/i)).toBeInTheDocument();

    const linhaAna = screen.getByText('Ana Admin').closest('li')!;
    expect(within(linhaAna).queryByText(/convite pendente/i)).not.toBeInTheDocument();
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
});
