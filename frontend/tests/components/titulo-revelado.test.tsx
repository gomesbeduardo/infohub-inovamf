import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TituloRevelado } from '@/features/landing/TituloRevelado';

describe('TituloRevelado', () => {
  it('lê o título inteiro para leitor de tela e começa visível (sem estado escondido)', () => {
    render(<TituloRevelado texto="Seis etapas, um entregável em cada uma" />);
    const h2 = screen.getByRole('heading', { level: 2, name: 'Seis etapas, um entregável em cada uma' });
    // jsdom não tem IntersectionObserver: nada é escondido e o texto fica parado.
    expect(h2).not.toHaveAttribute('data-revelar');
    expect(h2.querySelectorAll('.revelar-palavra')).toHaveLength(7);
  });
});
