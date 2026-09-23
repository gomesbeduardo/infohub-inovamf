import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@/design-system/theme';

vi.mock('@/data/api/consultas', () => ({
  useNumerosPublicos: vi.fn(),
}));

import { useNumerosPublicos } from '@/data/api/consultas';
import type { NumerosPublicos } from '@/data/api/tipos';
import { Landing } from '@/features/landing/Landing';
import { ETAPAS_VITRINE } from '@/features/landing/conteudo';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const NUMEROS: NumerosPublicos = {
  data: { ideias: 2048, equipesEmAndamento: 57, alunos: 913, cursos: 15 },
};

function mockNumeros(v: Partial<R<typeof useNumerosPublicos>>) {
  vi.mocked(useNumerosPublicos).mockReturnValue({
    data: NUMEROS,
    isPending: false,
    isError: false,
    error: null,
    ...v,
  } as unknown as R<typeof useNumerosPublicos>);
}

function renderLanding() {
  return render(
    <ThemeProvider>
      <Landing />
    </ThemeProvider>,
  );
}

describe('Landing', () => {
  beforeEach(() => {
    mockNumeros({});
  });

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

describe('Landing > números reais do hero (issue #157)', () => {
  it('com dados, mostra os 4 rótulos com os valores formatados em pt-BR', () => {
    mockNumeros({});
    const { container } = renderLanding();

    const dl = container.querySelector('dl');
    expect(dl).not.toBeNull();
    const numeros = within(dl as HTMLElement);

    expect(numeros.getAllByText('ideias recebidas').length).toBeGreaterThan(0);
    expect(numeros.getByText('2.048')).toBeInTheDocument();
    expect(numeros.getAllByText('equipes em andamento').length).toBeGreaterThan(0);
    expect(numeros.getByText('57')).toBeInTheDocument();
    expect(numeros.getAllByText('alunos participando').length).toBeGreaterThan(0);
    expect(numeros.getByText('913')).toBeInTheDocument();
    expect(numeros.getAllByText('cursos representados').length).toBeGreaterThan(0);
    expect(numeros.getByText('15')).toBeInTheDocument();
  });

  it('carregando, mostra um placeholder do mesmo tamanho com aria-busy (nunca número inventado)', () => {
    mockNumeros({ data: undefined, isPending: true, isError: false });
    const { container } = renderLanding();

    const dl = container.querySelector('dl');
    expect(dl).not.toBeNull();
    expect(dl).toHaveAttribute('aria-busy', 'true');
    // nenhum dos valores reais/antigos aparece enquanto carrega
    expect(within(dl as HTMLElement).queryByText('2.048')).toBeNull();
  });

  it('erro, o <dl> de números some (nunca volta a mostrar número inventado)', () => {
    mockNumeros({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Não foi possível carregar os números'),
    });
    const { container } = renderLanding();

    expect(container.querySelector('dl')).toBeNull();
  });
});
