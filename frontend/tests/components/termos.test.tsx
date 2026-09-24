import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/data/api/consultas', () => ({ useTermosVigente: vi.fn() }));

import { useTermosVigente } from '@/data/api/consultas';
import { TermosUso } from '@/features/legal/TermosUso';
import { Privacidade } from '@/features/legal/Privacidade';

function mockTermos(estado: Partial<ReturnType<typeof useTermosVigente>>) {
  vi.mocked(useTermosVigente).mockReturnValue({
    isPending: false,
    isError: false,
    data: undefined,
    ...estado,
  } as ReturnType<typeof useTermosVigente>);
}

describe('/termos', () => {
  it('mostra título, versão e seções vindas da API, com link para a Política', () => {
    mockTermos({
      data: {
        versao: '2026-09',
        titulo: 'Termos de Uso do InfoHub',
        conteudo: '## 1. O que é\n\nUma plataforma.\n\n## 2. Sua conta\n\nÉ pessoal.',
        publicadoEm: '2026-09-24T00:00:00.000Z',
      },
    });
    render(<TermosUso />);
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de Uso do InfoHub' })).toBeInTheDocument();
    expect(screen.getByText(/versão 2026-09/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '2. Sua conta' })).toBeInTheDocument();
    expect(screen.getByText('É pessoal.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /política de privacidade/i })).toHaveAttribute('href', '/privacidade');
  });

  it('erro ao carregar vira aviso, não tela em branco', () => {
    mockTermos({ isError: true });
    render(<TermosUso />);
    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
  });
});

describe('/privacidade', () => {
  it('tem as seções exigidas pelo RNF-02 e a versão 2026-09', () => {
    render(<Privacidade />);
    for (const secao of [
      /dados que coletamos/i,
      /para que usamos/i,
      /base legal/i,
      /quem vê/i,
      /por quanto tempo guardamos/i,
      /seus direitos/i,
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: secao })).toBeInTheDocument();
    }
    expect(screen.getByText(/versão 2026-09/i)).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
