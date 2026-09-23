import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { textoPrazo } from '@/domain/prazo';
import { PrazoChip } from '@/design-system/components/PrazoChip';

const HOJE = '2026-09-22';

describe('textoPrazo (B3)', () => {
  it('vence hoje / em 1 dia / em N dias', () => {
    expect(textoPrazo('2026-09-22T00:00:00.000Z', 'pendente', HOJE)).toBe('vence hoje');
    expect(textoPrazo('2026-09-23', 'em_andamento', HOJE)).toBe('vence em 1 dia');
    expect(textoPrazo('2026-09-30', 'ajustar', HOJE)).toBe('vence em 8 dias');
  });

  it('atrasada há N dias — o status "atrasada" vem do backend (RN-04)', () => {
    expect(textoPrazo('2026-09-21', 'atrasada', HOJE)).toBe('atrasada há 1 dia');
    expect(textoPrazo('2026-09-19', 'atrasada', HOJE)).toBe('atrasada há 3 dias');
  });

  it('não decide atraso sozinho nem mostra prazo de tarefa entregue/aprovada', () => {
    expect(textoPrazo('2026-09-10', 'ajustar', HOJE)).toBeNull();
    expect(textoPrazo('2026-09-30', 'entregue', HOJE)).toBeNull();
    expect(textoPrazo('2026-09-30', 'aprovada', HOJE)).toBeNull();
  });
});

describe('PrazoChip', () => {
  it('atrasada usa o tom de perigo do DS', () => {
    render(<PrazoChip dataEntrega="2026-09-19" status="atrasada" hoje={HOJE} />);
    expect(screen.getByText('atrasada há 3 dias').className).toContain('text-danger-text');
  });

  it('não renderiza nada para tarefa aprovada', () => {
    const { container } = render(<PrazoChip dataEntrega="2026-09-19" status="aprovada" hoje={HOJE} />);
    expect(container).toBeEmptyDOMElement();
  });
});
