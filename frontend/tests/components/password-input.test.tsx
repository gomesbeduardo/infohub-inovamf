import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField } from '@/design-system/components/FormField';
import { PasswordInput } from '@/design-system/components/PasswordInput';

function renderCampo() {
  return render(
    <FormField label="Senha" htmlFor="senha">
      <PasswordInput id="senha" />
    </FormField>,
  );
}

describe('PasswordInput', () => {
  it('fica oculta por padrão (type=password)', () => {
    renderCampo();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('a associação com o label funciona (getByLabelText)', () => {
    renderCampo();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  it('pointerdown no olho revela a senha (type=text)', () => {
    renderCampo();
    const botao = screen.getByRole('button', { name: 'Mostrar senha enquanto pressionado' });
    fireEvent.pointerDown(botao);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    expect(botao).toHaveAttribute('aria-pressed', 'true');
  });

  it('pointerup esconde a senha novamente', () => {
    renderCampo();
    const botao = screen.getByRole('button', { name: 'Mostrar senha enquanto pressionado' });
    fireEvent.pointerDown(botao);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    fireEvent.pointerUp(botao);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(botao).toHaveAttribute('aria-pressed', 'false');
  });

  it('pointerleave enquanto pressionado esconde a senha', () => {
    renderCampo();
    const botao = screen.getByRole('button', { name: 'Mostrar senha enquanto pressionado' });
    fireEvent.pointerDown(botao);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    fireEvent.pointerLeave(botao);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('pointercancel enquanto pressionado esconde a senha', () => {
    renderCampo();
    const botao = screen.getByRole('button', { name: 'Mostrar senha enquanto pressionado' });
    fireEvent.pointerDown(botao);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    fireEvent.pointerCancel(botao);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('teclado: Space keydown revela e keyup esconde', () => {
    renderCampo();
    const botao = screen.getByRole('button', { name: 'Mostrar senha enquanto pressionado' });
    fireEvent.keyDown(botao, { key: ' ' });
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    fireEvent.keyUp(botao, { key: ' ' });
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('teclado: Enter keydown revela e keyup esconde', () => {
    renderCampo();
    const botao = screen.getByRole('button', { name: 'Mostrar senha enquanto pressionado' });
    fireEvent.keyDown(botao, { key: 'Enter' });
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    fireEvent.keyUp(botao, { key: 'Enter' });
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('o botão é type="button" e clicar nele dentro de um form não o submete', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <FormField label="Senha" htmlFor="senha">
          <PasswordInput id="senha" />
        </FormField>
      </form>,
    );
    const botao = screen.getByRole('button', { name: 'Mostrar senha enquanto pressionado' });
    expect(botao).toHaveAttribute('type', 'button');
    await user.click(botao);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('quando disabled, o botão do olho também fica desabilitado', () => {
    render(
      <FormField label="Senha" htmlFor="senha">
        <PasswordInput id="senha" disabled />
      </FormField>,
    );
    expect(screen.getByLabelText('Senha')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Mostrar senha enquanto pressionado' }),
    ).toBeDisabled();
  });
});
