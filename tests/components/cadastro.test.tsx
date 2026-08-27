import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

import { StoreProvider } from '@/data/store';
import { CadastroForm } from '@/features/aluno-cadastro/CadastroForm';
import { getUsuarioIdAtual } from '@/data/session';

function renderForm() {
  return render(
    <StoreProvider>
      <CadastroForm />
    </StoreProvider>,
  );
}

describe('CadastroForm', () => {
  beforeEach(() => {
    push.mockClear();
    sessionStorage.clear();
  });

  it('submeter vazio mostra erros dos obrigatórios e não navega', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));
    expect(screen.getByText(/informe seu nome/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('cadastro válido com 1 integrante cria a equipe e vai para /aluno', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Nome'), 'Novo Aluno');
    await user.type(screen.getByLabelText('E-mail'), 'novo@teste.dev');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.type(screen.getByLabelText('Telefone'), '(55) 90000-1111');
    await user.type(screen.getByLabelText('Curso'), 'ADS');
    await user.type(screen.getByLabelText('Nome da ideia'), 'Ideia Teste');
    await user.type(
      screen.getByLabelText('Descrição da ideia'),
      'Uma descrição de teste para a ideia.',
    );
    await user.selectOptions(screen.getByLabelText('Área'), '1');

    await user.click(screen.getByRole('button', { name: /adicionar integrante/i }));
    await user.type(screen.getByLabelText('Nome do integrante 1'), 'Colega Um');

    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(push).toHaveBeenCalledWith('/aluno');
    expect(getUsuarioIdAtual()).toBe('u-novo');
  });
});
