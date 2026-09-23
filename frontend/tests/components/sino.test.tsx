import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/data/api/consultas', () => ({ useNotificacoes: vi.fn() }));

import { useNotificacoes } from '@/data/api/consultas';
import type { Notificacao } from '@/data/api/tipos';
import { SinoNotificacoes } from '@/features/shell/SinoNotificacoes';
import {
  chaveVisto,
  contarNaoLidas,
  destinoNotificacao,
  tempoRelativo,
} from '@/features/shell/notificacoes';

type R<T extends (...a: never[]) => unknown> = ReturnType<T>;

const ALUNO = { slug: 'lia', nome: 'Lia Líder', role: 'aluno' as const };

const NOTIFS: Notificacao[] = [
  {
    tipo: 'entrega_ajustar',
    assunto: 'Ajustes solicitados',
    status: 'pendente',
    dados: { tarefa: 'Pitch vídeo', comentario: 'Refazer o áudio', equipe_slug: 'agro' },
    criadoEm: '2026-09-21T10:00:00Z',
  },
  {
    tipo: 'lembrete_manual',
    assunto: 'Lembrete da equipe InfoHub',
    status: 'pendente',
    dados: { mensagem: 'Reunião sexta' },
    criadoEm: '2026-09-21T09:00:00Z',
  },
  {
    tipo: 'nova_tarefa',
    assunto: 'Nova tarefa atribuída',
    status: 'pendente',
    dados: { titulo: 'BMC final' },
    criadoEm: '2026-09-19T10:00:00Z',
  },
];

function mockNotificacoes(data: Notificacao[] = NOTIFS) {
  vi.mocked(useNotificacoes).mockReturnValue({
    data,
    isPending: false,
    isError: false,
    error: null,
  } as unknown as R<typeof useNotificacoes>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockNotificacoes();
});

describe('SinoNotificacoes (B1)', () => {
  it('conta só o que chegou depois da última abertura do painel', () => {
    localStorage.setItem(chaveVisto('lia'), '2026-09-20T12:00:00Z');
    render(<SinoNotificacoes usuario={ALUNO} />);
    expect(screen.getByTestId('contador-notificacoes')).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: 'Notificações: 2 novas' })).toBeInTheDocument();
  });

  it('sem registro de abertura, todas contam como novas', () => {
    render(<SinoNotificacoes usuario={ALUNO} />);
    expect(screen.getByTestId('contador-notificacoes')).toHaveTextContent('3');
  });

  it('abrir o painel zera o contador, grava o horário e lista com link para a tela certa', async () => {
    const user = userEvent.setup();
    render(<SinoNotificacoes usuario={ALUNO} />);
    await user.click(screen.getByRole('button', { name: /notificações/i }));

    expect(screen.queryByTestId('contador-notificacoes')).not.toBeInTheDocument();
    expect(localStorage.getItem(chaveVisto('lia'))).not.toBeNull();

    const painel = screen.getByRole('region', { name: 'Notificações' });
    const links = within(painel).getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveTextContent('Ajustes solicitados');
    expect(links[0]).toHaveTextContent('Pitch vídeo');
    expect(links[0]).toHaveAttribute('href', '/aluno/tarefas');
    expect(links[1]).toHaveAttribute('href', '/aluno');
  });

  it('Esc fecha o painel', async () => {
    const user = userEvent.setup();
    render(<SinoNotificacoes usuario={ALUNO} />);
    await user.click(screen.getByRole('button', { name: /notificações/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Notificações' })).not.toBeInTheDocument();
  });

  it('sem notificações mostra o estado vazio', async () => {
    mockNotificacoes([]);
    const user = userEvent.setup();
    render(<SinoNotificacoes usuario={ALUNO} />);
    expect(screen.queryByTestId('contador-notificacoes')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /notificações/i }));
    expect(screen.getByText('Nenhuma notificação por enquanto.')).toBeInTheDocument();
  });
});

describe('notificacoes — regras de apresentação', () => {
  const agora = new Date('2026-09-22T12:00:00Z');

  it('tempoRelativo', () => {
    expect(tempoRelativo('2026-09-22T11:59:40Z', agora)).toBe('agora');
    expect(tempoRelativo('2026-09-22T11:55:00Z', agora)).toBe('há 5 min');
    expect(tempoRelativo('2026-09-22T10:00:00Z', agora)).toBe('há 2 h');
    expect(tempoRelativo('2026-09-21T11:00:00Z', agora)).toBe('há 1 dia');
    expect(tempoRelativo('2026-09-19T12:00:00Z', agora)).toBe('há 3 dias');
  });

  it('destinoNotificacao leva à equipe certa por papel', () => {
    const n = NOTIFS[0]!;
    expect(destinoNotificacao(n, 'admin')).toBe('/admin/equipes/agro');
    expect(destinoNotificacao(n, 'mentor')).toBe('/orientador/equipes/agro');
    expect(destinoNotificacao(NOTIFS[1]!, 'mentor')).toBe('/orientador');
  });

  it('destinoNotificacao leva pedidos de redefinição de senha às contas (admin)', () => {
    const n: Notificacao = {
      tipo: 'recuperacao_senha',
      assunto: 'Pedido de redefinição de senha',
      status: 'pendente',
      dados: { titulo: 'Lia Líder' },
      criadoEm: '2026-09-22T11:00:00Z',
    };
    expect(destinoNotificacao(n, 'admin')).toBe('/admin/contas');
  });

  it('contarNaoLidas trata "visto" inválido como nunca aberto', () => {
    expect(contarNaoLidas(NOTIFS, 'lixo')).toBe(3);
  });
});
