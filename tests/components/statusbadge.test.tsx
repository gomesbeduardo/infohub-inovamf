import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { StageTag } from '@/design-system/components/StageTag';

describe('StatusBadge', () => {
  it('mostra o rótulo pt-BR do status', () => {
    render(<StatusBadge status="atrasada" />);
    expect(screen.getByText('Atrasada')).toBeInTheDocument();
  });

  it('usa a cor tokenizada do status via style', () => {
    render(<StatusBadge status="atrasada" />);
    const el = screen.getByText('Atrasada');
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('--st-atrasada-bg');
    expect(style).toContain('--st-atrasada-fg');
  });

  it('mapeia todos os status para rótulos', () => {
    render(<StatusBadge status="em_andamento" />);
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });
});

describe('StageTag', () => {
  it('usa a cor da etapa via token --stage-N', () => {
    render(<StageTag etapaId={3}>Etapa 3</StageTag>);
    const el = screen.getByText('Etapa 3');
    expect(el.getAttribute('style') ?? '').toContain('--stage-3');
  });
});
