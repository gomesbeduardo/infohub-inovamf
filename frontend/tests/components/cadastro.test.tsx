import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

vi.mock('@/data/api/consultas', () => ({
  useAreas: vi.fn(),
  useInscricao: vi.fn(),
}));

import { useAreas, useInscricao } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import { CadastroForm } from '@/features/aluno-cadastro/CadastroForm';

const AREAS = [
  { nome: 'Tecnologia', ordem: 1 },
  { nome: 'Saúde', ordem: 2 },
];

const mutate = vi.fn();

function mockInscricao(estado: Partial<ReturnType<typeof useInscricao>>) {
  vi.mocked(useInscricao).mockReturnValue({
    mutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
    error: null,
    ...estado,
  } as ReturnType<typeof useInscricao>);
}

async function preencherDadosBasicos(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome'), 'Novo Aluno');
  await user.type(screen.getByLabelText('E-mail'), 'novo@teste.dev');
  await user.type(screen.getByLabelText('Senha'), '12345678');
  await user.type(screen.getByLabelText('Telefone'), '(55) 90000-1111');
  await user.selectOptions(screen.getByLabelText('Curso'), 'Sistemas de Informação');
  await user.selectOptions(screen.getByLabelText(/Semestre\/Módulo/), '4');
  await user.type(screen.getByLabelText('Nome da ideia'), 'Ideia Teste');
  await user.type(
    screen.getByLabelText('Descrição da ideia'),
    'Uma descrição de teste para a ideia.',
  );
  await user.selectOptions(screen.getByLabelText('Área'), 'Tecnologia');
}

describe('CadastroForm (API real)', () => {
  beforeEach(() => {
    push.mockClear();
    mutate.mockClear();
    vi.mocked(useAreas).mockReturnValue({ data: AREAS } as ReturnType<typeof useAreas>);
    mockInscricao({});
  });

  it('submeter vazio mostra erros dos obrigatórios e não chama a API', async () => {
    const user = userEvent.setup();
    render(<CadastroForm />);
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));
    expect(screen.getByText(/informe seu nome/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('envia o corpo exato da inscrição (líder, ideia e colegas)', async () => {
    const user = userEvent.setup();
    render(<CadastroForm />);

    await preencherDadosBasicos(user);

    await user.click(screen.getByRole('button', { name: /adicionar integrante/i }));
    await user.type(screen.getByLabelText('Nome do integrante 1'), 'Colega Um');
    await user.type(screen.getByLabelText('E-mail do integrante 1'), 'colega@teste.dev');

    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(mutate).toHaveBeenCalledWith({
      lider: {
        nome: 'Novo Aluno',
        email: 'novo@teste.dev',
        senha: '12345678',
        telefone: '(55) 90000-1111',
        curso: 'Sistemas de Informação',
        semestre: '4',
        matricula: undefined,
      },
      ideia: {
        nome: 'Ideia Teste',
        descricao: 'Uma descrição de teste para a ideia.',
        estagio: 'ideia',
        area: 'Tecnologia',
        origem: undefined,
      },
      colegas: [{ nome: 'Colega Um', email: 'colega@teste.dev' }],
    });
  });

  it('colega sem e-mail bloqueia o envio com erro no campo', async () => {
    const user = userEvent.setup();
    render(<CadastroForm />);

    await preencherDadosBasicos(user);
    await user.click(screen.getByRole('button', { name: /adicionar integrante/i }));
    await user.type(screen.getByLabelText('Nome do integrante 1'), 'Colega Sem Email');

    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(screen.getByText(/informe o e-mail/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('409 RN03_EQUIPE_ATIVA mostra a mensagem no colega correspondente', async () => {
    mockInscricao({
      isError: true,
      error: new ApiError(
        409,
        'RN03_EQUIPE_ATIVA',
        'colega@teste.dev já está em outra equipe ativa',
      ),
    });
    const user = userEvent.setup();
    render(<CadastroForm />);

    await user.click(screen.getByRole('button', { name: /adicionar integrante/i }));
    await user.type(screen.getByLabelText('E-mail do integrante 1'), 'colega@teste.dev');

    expect(
      screen.getByText(/colega@teste\.dev já está em outra equipe ativa/i),
    ).toBeInTheDocument();
  });

  it('409 EMAIL_TAKEN (líder) mostra alerta geral com link para entrar', () => {
    mockInscricao({
      isError: true,
      error: new ApiError(409, 'EMAIL_TAKEN', 'Este e-mail já possui uma conta.'),
    });
    render(<CadastroForm />);

    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent(/este e-mail já possui uma conta/i);
    expect(screen.getByRole('link', { name: /entrar/i })).toHaveAttribute('href', '/login');
  });

  it('botão fica desabilitado e com rótulo de carregamento durante o envio', () => {
    mockInscricao({ isPending: true });
    render(<CadastroForm />);
    expect(screen.getByRole('button', { name: /cadastrando/i })).toBeDisabled();
  });

  it('sucesso mostra os links de convite com botão copiar (colega sem convite entra direto)', async () => {
    const user = userEvent.setup();
    // Precisa vir depois de userEvent.setup(): ele instala seu próprio clipboard fake.
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: escrever },
      configurable: true,
    });

    mockInscricao({
      isSuccess: true,
      data: {
        access: 'a',
        refresh: 'r',
        usuario: { slug: 's-novo', nome: 'Novo Aluno', role: 'aluno' },
        equipe: { slug: 'ideia-teste', nomeIdeia: 'Ideia Teste' },
        colegas: [
          { slug: 'c1', nome: 'Colega Um', email: 'colega@teste.dev', conviteUrl: 'https://app/convite?token=abc' },
          { slug: 'c2', nome: 'Colega Dois', email: 'ja-tem@teste.dev', conviteUrl: null },
        ],
      },
    });

    render(<CadastroForm />);

    expect(screen.getByText('Ideia Teste')).toBeInTheDocument();
    expect(screen.getByText(/já tem conta — entrou na equipe/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^copiar$/i }));
    expect(escrever).toHaveBeenCalledWith('https://app/convite?token=abc');

    await user.click(screen.getByRole('button', { name: /ir para minha equipe/i }));
    expect(push).toHaveBeenCalledWith('/aluno');
  });
});
