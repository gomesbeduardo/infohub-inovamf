import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { RecuperarSenhaForm } from '@/features/auth/RecuperarSenhaForm';

describe('RecuperarSenhaForm', () => {
  it('orienta a falar com a coordenação (sem backend até o Plano 4)', () => {
    render(<RecuperarSenhaForm />);
    expect(
      screen.getByText(/fale com a coordenação/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/admin@infohub\.dev/i)).toBeInTheDocument();
  });

  it('tem um link de volta ao login', () => {
    render(<RecuperarSenhaForm />);
    expect(screen.getByRole('link', { name: /voltar ao login/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });
});
