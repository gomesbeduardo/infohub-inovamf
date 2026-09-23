import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DistribuicaoPorEtapa,
  type PontoEtapa,
} from '@/features/admin-dashboard/DistribuicaoPorEtapa';

const PONTOS: PontoEtapa[] = [
  { numero: 1, nome: 'Envio da ideia', total: 5 },
  { numero: 2, nome: 'Contato com a equipe', total: 3 },
  { numero: 3, nome: 'Encontro 1', total: 3 },
  { numero: 4, nome: 'Encontro 2', total: 1 },
  { numero: 5, nome: 'Encontro 3', total: 2 },
  { numero: 6, nome: 'Encontro 4', total: 1 },
];

describe('DistribuicaoPorEtapa', () => {
  it('desenha uma barra por etapa, na cor da etapa', () => {
    const { container } = render(<DistribuicaoPorEtapa pontos={PONTOS} />);

    const barras = container.querySelectorAll('rect[fill^="var(--stage"]');
    expect(barras).toHaveLength(PONTOS.length);
  });

  it('descreve a série para leitores de tela', () => {
    render(<DistribuicaoPorEtapa pontos={PONTOS} />);

    const grafico = screen.getByRole('img');
    expect(grafico).toHaveAccessibleName(/etapa 1 \(Envio da ideia\): 5/i);
    expect(grafico).toHaveAccessibleName(/etapa 6 \(Encontro 4\): 1/i);
  });

  it('alterna para a tabela com os mesmos valores', async () => {
    const user = userEvent.setup();
    render(<DistribuicaoPorEtapa pontos={PONTOS} />);

    await user.click(screen.getByRole('button', { name: /ver tabela/i }));

    const tabela = screen.getByRole('table');
    expect(tabela).toBeInTheDocument();
    PONTOS.forEach((p) => {
      expect(screen.getByText(p.nome)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /ver gráfico/i })).toBeInTheDocument();
  });
});
