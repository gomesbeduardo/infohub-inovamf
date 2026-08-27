import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/design-system/components/Button';

describe('Button', () => {
  it('renderiza o texto como botão', () => {
    render(<Button>Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('aplica a variante primária por padrão (bg-primary)', () => {
    render(<Button>Enviar</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('a variante secondary não usa bg-primary', () => {
    render(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByRole('button')).not.toHaveClass('bg-primary');
  });

  it('desabilita quando disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button disabled onClick={onClick}>
        Enviar
      </Button>,
    );
    const botao = screen.getByRole('button');
    expect(botao).toBeDisabled();
    await user.click(botao);
    expect(onClick).not.toHaveBeenCalled();
  });
});
