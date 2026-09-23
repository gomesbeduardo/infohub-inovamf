import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DURACAO_TOAST_MS, ToastProvider, useToast } from '@/design-system/components/Toast';
import { Skeleton } from '@/design-system/components/Skeleton';

function Disparador({ mensagem = 'Tarefa criada.' }: { mensagem?: string }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.sucesso(mensagem)}>
      disparar
    </button>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast (B2)', () => {
  it('anuncia o sucesso numa região aria-live="polite"', () => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'disparar' }));
    const regiao = screen.getByRole('status');
    expect(regiao).toHaveAttribute('aria-live', 'polite');
    expect(regiao).toHaveTextContent('Tarefa criada.');
  });

  it('some sozinho depois de 4 s', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'disparar' }));
    expect(screen.getByText('Tarefa criada.')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(DURACAO_TOAST_MS);
    });
    expect(screen.queryByText('Tarefa criada.')).not.toBeInTheDocument();
  });

  it('pode ser fechado pelo botão e usa a animação .toast-in', () => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'disparar' }));
    expect(screen.getByText('Tarefa criada.').closest('.toast-in')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText('Tarefa criada.')).not.toBeInTheDocument();
  });

  it('fora do provider, useToast é um no-op (telas isoladas não quebram)', () => {
    render(<Disparador />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'disparar' }))).not.toThrow();
  });
});

describe('Skeleton (B2)', () => {
  it('anuncia "Carregando…" e desenha N barras com pulso só em motion-safe', () => {
    const { container } = render(<Skeleton linhas={4} />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    const barras = container.querySelectorAll('[aria-hidden="true"]');
    expect(barras).toHaveLength(4);
    barras.forEach((b) => expect(b.className).toContain('motion-safe:animate-pulse'));
  });
});
