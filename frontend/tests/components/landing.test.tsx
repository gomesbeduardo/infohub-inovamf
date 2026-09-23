import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/design-system/theme';

// next/font é transformado pelo compilador do Next; no Vitest basta a classe.
vi.mock('next/font/google', () => ({ Caveat: () => ({ className: 'fonte-rascunho' }) }));

vi.mock('@/data/api/consultas', () => ({
  useNumerosPublicos: vi.fn(),
}));

import { useNumerosPublicos } from '@/data/api/consultas';
import type { NumerosPublicos } from '@/data/api/tipos';
import { Landing } from '@/features/landing/Landing';
import { CASOS_VITRINE, CONTATO_AMF, ETAPAS_VITRINE } from '@/features/landing/conteudo';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const NUMEROS: NumerosPublicos = { ideias: 2048, equipesEmAndamento: 57, alunos: 913, cursos: 15 };

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

  it('tem as seções âncora, cada uma com o botão para a próxima', () => {
    const { container } = renderLanding();

    for (const id of ['o-que-e', 'como-funciona', 'equipes', 'casos', 'enviar']) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
    expect(screen.getByRole('link', { name: 'Conheça o InfoHub' })).toHaveAttribute('href', '#o-que-e');
    expect(within(document.getElementById('o-que-e')!).getByRole('link', { name: 'Como funciona' })).toHaveAttribute('href', '#como-funciona');
    expect(screen.getByRole('link', { name: 'Veja quem já chegou lá' })).toHaveAttribute('href', '#casos');
    expect(screen.getByRole('link', { name: 'Quero ser o próximo' })).toHaveAttribute('href', '#enviar');
  });

  it('cabeçalho só com a marca, Entrar e Enviar minha ideia (sem tema nem menu de seções)', () => {
    renderLanding();
    const cabecalho = screen.getAllByRole('banner')[0]!;
    const topo = within(cabecalho);
    expect(topo.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(topo.getByRole('link', { name: 'Enviar minha ideia' })).toHaveAttribute('href', '/cadastro');
    expect(topo.queryByRole('navigation')).toBeNull();
    expect(topo.queryByRole('button')).toBeNull();
  });

  it('chamada final tem um botão só: enviar a ideia', () => {
    renderLanding();
    const cta = within(document.getElementById('enviar')!);
    const links = cta.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/cadastro');
  });

  it('rodapé mostra o endereço e os telefones da AMF', () => {
    renderLanding();
    const rodape = within(screen.getByRole('contentinfo'));
    CONTATO_AMF.linhas.forEach((l) => expect(rodape.getByText(l)).toBeInTheDocument());
    expect(rodape.getByRole('link', { name: '(55) 3289-1139' })).toHaveAttribute('href', 'tel:+555532891139');
  });

  it('carrossel de casos: setas trocam o card em foco e há botão de pausa', async () => {
    const user = userEvent.setup();
    renderLanding();
    const carrossel = within(screen.getByRole('region', { name: 'Casos em destaque' }));
    const visivel = () => carrossel.getAllByRole('group', { hidden: false }).map((g) => g.textContent);
    expect(visivel()[0]).toContain(CASOS_VITRINE[0]!.nomeIdeia);
    await user.click(carrossel.getAllByRole('button', { name: 'Próximo caso' })[0]!);
    expect(visivel()[0]).toContain(CASOS_VITRINE[1]!.nomeIdeia);
    await user.click(carrossel.getAllByRole('button', { name: 'Caso anterior' })[0]!);
    expect(visivel()[0]).toContain(CASOS_VITRINE[0]!.nomeIdeia);
    await user.click(carrossel.getByRole('button', { name: 'Pausar a troca automática' }));
    expect(carrossel.getByRole('button', { name: 'Retomar a troca automática' })).toBeInTheDocument();
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
