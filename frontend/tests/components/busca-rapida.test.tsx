import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/data/api/consultas', () => ({ useEquipes: vi.fn(), useUsuarios: vi.fn() }));

import { useEquipes, useUsuarios } from '@/data/api/consultas';
import type { EquipeResumo, UsuarioAdmin } from '@/data/api/tipos';
import { BuscaRapida } from '@/features/shell/BuscaRapida';
import { filtrarResultados } from '@/features/shell/busca';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

function equipe(slug: string, nomeIdeia: string): EquipeResumo {
  return {
    slug, nomeIdeia, descricaoIdeia: '', status: 'ativa', estagio: 'ideia',
    etapa: { numero: 2, nome: 'Contato com a equipe' }, area: null, ciclo: null, mentor: null, lider: null,
    membrosCount: 3, tarefasAtrasadas: 0, criadoEm: '2026-09-01T00:00:00Z',
  };
}
const EQUIPES = [equipe('ecorota', 'EcoRota'), equipe('ecologia', 'Ecologia Já'), equipe('saudeja', 'SaúdeJá')];
const PESSOAS: UsuarioAdmin[] = [
  { slug: 'carla', nome: 'Carla Menezes', email: 'mentor1@demo.infohub.dev', telefone: '', role: 'mentor', ativo: true, conviteAceito: true },
  { slug: 'bruna', nome: 'Bruna Lopes', email: 'bruna.lopes@demo.infohub.dev', telefone: '', role: 'aluno', ativo: true, conviteAceito: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useEquipes).mockReturnValue({ data: EQUIPES } as unknown as R<typeof useEquipes>);
  vi.mocked(useUsuarios).mockReturnValue({ data: PESSOAS } as unknown as R<typeof useUsuarios>);
});

async function abrir(papel: 'admin' | 'mentor' = 'admin') {
  const user = userEvent.setup();
  render(<BuscaRapida papel={papel} />);
  await user.keyboard('{Control>}k{/Control}');
  return user;
}

describe('BuscaRapida (B4)', () => {
  it('Ctrl+K abre o diálogo com o campo de busca focado', async () => {
    const user = userEvent.setup();
    render(<BuscaRapida papel="admin" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: 'Busca rápida' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Buscar' })).toHaveFocus());
  });

  it('a lupa do topo também abre', async () => {
    const user = userEvent.setup();
    render(<BuscaRapida papel="admin" />);
    await user.click(screen.getByRole('button', { name: 'Busca rápida' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('filtra equipes pelo nome (sem acento); Enter navega e fecha', async () => {
    const user = await abrir();
    await user.type(screen.getByRole('combobox', { name: 'Buscar' }), 'saude');
    const opcoes = screen.getAllByRole('option');
    expect(opcoes).toHaveLength(1);
    expect(opcoes[0]).toHaveTextContent('SaúdeJá');
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/admin/equipes/saudeja');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('setas mudam a opção ativa', async () => {
    const user = await abrir();
    await user.type(screen.getByRole('combobox', { name: 'Buscar' }), 'eco');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/admin/equipes/ecologia');
  });

  it('admin acha contas por e-mail e vai para a linha delas em Contas', async () => {
    const user = await abrir();
    await user.type(screen.getByRole('combobox', { name: 'Buscar' }), 'mentor1');
    expect(screen.getByRole('option')).toHaveTextContent('Carla Menezes');
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/admin/contas#conta-carla');
  });

  it('mentor: só equipes, sem consultar contas', async () => {
    const user = await abrir('mentor');
    expect(useUsuarios).toHaveBeenCalledWith(undefined, { enabled: false });
    await user.type(screen.getByRole('combobox', { name: 'Buscar' }), 'ecorota');
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/orientador/equipes/ecorota');
  });

  it('Esc fecha o diálogo', async () => {
    const user = await abrir();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('filtrarResultados', () => {
  it('termo vazio não lista nada; mentor não recebe pessoas', () => {
    expect(filtrarResultados({ termo: '  ', papel: 'admin', equipes: EQUIPES, pessoas: PESSOAS })).toEqual([]);
    expect(filtrarResultados({ termo: 'carla', papel: 'mentor', equipes: EQUIPES, pessoas: PESSOAS })).toEqual([]);
  });

  it('admin também acha alunos (Contas lista alunos)', () => {
    expect(filtrarResultados({ termo: 'bruna', papel: 'admin', equipes: EQUIPES, pessoas: PESSOAS })).toEqual([
      { chave: 'pessoa-bruna', titulo: 'Bruna Lopes', subtitulo: 'bruna.lopes@demo.infohub.dev', href: '/admin/contas#conta-bruna' },
    ]);
  });
});
