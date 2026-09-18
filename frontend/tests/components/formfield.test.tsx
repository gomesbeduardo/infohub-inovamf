import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '@/design-system/components/FormField';
import { Input } from '@/design-system/components/Input';

describe('FormField', () => {
  it('mostra a mensagem de erro e associa via aria-describedby', () => {
    render(
      <FormField label="E-mail" htmlFor="email" error="Obrigatório">
        <Input id="email" />
      </FormField>,
    );

    // mensagem visível
    expect(screen.getByText('Obrigatório')).toBeInTheDocument();

    // associação acessível: o input aponta para o id da mensagem de erro
    const input = screen.getByLabelText('E-mail');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const msg = document.getElementById(describedBy as string);
    expect(msg).toHaveTextContent('Obrigatório');
  });

  it('marca o input como inválido quando há erro', () => {
    render(
      <FormField label="E-mail" htmlFor="email" error="Obrigatório">
        <Input id="email" />
      </FormField>,
    );
    expect(screen.getByLabelText('E-mail')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
