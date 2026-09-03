import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/design-system/theme';
import { Landing } from '@/features/landing/Landing';
import { ETAPAS_VITRINE } from '@/features/landing/conteudo';

function renderLanding() {
  return render(
    <ThemeProvider>
      <Landing />
    </ThemeProvider>,
  );
}

describe('Landing', () => {
  it('oferece as duas portas de entrada: enviar a ideia e entrar', () => {
    renderLanding();

    const enviar = screen.getAllByRole('link', { name: /enviar minha ideia/i });
    expect(enviar.length).toBeGreaterThan(0);
    enviar.forEach((l) => expect(l).toHaveAttribute('href', '/cadastro'));

    const entrar = screen.getAllByRole('link', { name: /entrar/i });
    expect(entrar.length).toBeGreaterThan(0);
    entrar.forEach((l) => expect(l).toHaveAttribute('href', '/login'));
  });

  it('explica as seis etapas da jornada com o entregável de cada uma', () => {
    renderLanding();

    expect(ETAPAS_VITRINE).toHaveLength(6);
    ETAPAS_VITRINE.forEach((etapa) => {
      expect(screen.getAllByText(etapa.nome).length).toBeGreaterThan(0);
      expect(screen.getAllByText(etapa.entregavel).length).toBeGreaterThan(0);
    });
  });

  it('tem as seções âncora do menu', () => {
    const { container } = renderLanding();

    for (const id of ['o-que-e', 'como-funciona', 'equipes', 'casos']) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });
});
