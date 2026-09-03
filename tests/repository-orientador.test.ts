import { describe, it, expect } from 'vitest';
import { seed } from '@/data/fixtures';
import type { AppState, HistoricoEtapa, Tarefa, Usuario } from '@/domain/types';
import {
  moverEquipeParaEtapa,
  serieSemanalMentor,
} from '@/data/repository';

const mentor1 = (s: AppState): Usuario =>
  s.usuarios.find((u) => u.id === 'u-mentor-1')!;

describe('moverEquipeParaEtapa', () => {
  it('move a equipe para uma etapa arbitrária à frente (forçando o salto)', () => {
    const s = seed();
    const r = moverEquipeParaEtapa(s, 'eq-1', {
      destino: 3,
      autorId: 'u-mentor-1',
      forcar: true,
    });
    const eq = r.equipes.find((e) => e.id === 'eq-1')!;
    expect(eq.etapaAtualId).toBe(3);
    const h = r.historico[r.historico.length - 1];
    expect(h.equipeId).toBe('eq-1');
    expect(h.etapaOrigemId).toBe(1);
    expect(h.etapaDestinoId).toBe(3);
    expect(h.forcado).toBe(true);
  });

  it('salto de mais de uma etapa marca o histórico como forçado mesmo sem forcar explícito', () => {
    const r = moverEquipeParaEtapa(seed(), 'eq-1', {
      destino: 3,
      autorId: 'u-mentor-1',
    });
    // eq-1 (etapa 1) não tem obrigatória pendente, então o salto acontece
    const eq = r.equipes.find((e) => e.id === 'eq-1')!;
    expect(eq.etapaAtualId).toBe(3);
    expect(r.historico[r.historico.length - 1].forcado).toBe(true);
  });

  it('não avança com obrigatória pendente sem forçar (RN-01)', () => {
    const s = seed();
    const r = moverEquipeParaEtapa(s, 'eq-3', {
      destino: 5,
      autorId: 'u-mentor-2',
    });
    expect(r.equipes.find((e) => e.id === 'eq-3')!.etapaAtualId).toBe(3);
    expect(r.historico.length).toBe(s.historico.length);
  });

  it('retroceder para uma etapa anterior reativa a equipe', () => {
    const r = moverEquipeParaEtapa(seed(), 'eq-3', {
      destino: 1,
      autorId: 'u-mentor-2',
    });
    const eq = r.equipes.find((e) => e.id === 'eq-3')!;
    expect(eq.etapaAtualId).toBe(1);
    expect(eq.status).toBe('ativa');
  });

  it('destino "pronta" marca a equipe como pronta_inovamf', () => {
    const r = moverEquipeParaEtapa(seed(), 'eq-1', {
      destino: 'pronta',
      autorId: 'u-mentor-1',
    });
    const eq = r.equipes.find((e) => e.id === 'eq-1')!;
    expect(eq.status).toBe('pronta_inovamf');
    expect(eq.prontaInovamfEm).toBeTruthy();
  });

  it('mover uma equipe pronta de volta para uma etapa a reativa', () => {
    const r = moverEquipeParaEtapa(seed(), 'eq-7', {
      destino: 3,
      autorId: 'u-mentor-1',
    });
    const eq = r.equipes.find((e) => e.id === 'eq-7')!;
    expect(eq.etapaAtualId).toBe(3);
    expect(eq.status).toBe('ativa');
    expect(eq.prontaInovamfEm).toBeUndefined();
  });

  it('mover para a mesma etapa é no-op', () => {
    const s = seed();
    const r = moverEquipeParaEtapa(s, 'eq-3', {
      destino: 3,
      autorId: 'u-mentor-2',
    });
    expect(r).toBe(s);
  });

  it('equipe inexistente é no-op', () => {
    const s = seed();
    expect(moverEquipeParaEtapa(s, 'eq-nao-existe', { destino: 2, autorId: 'x' })).toBe(s);
  });

  it('não muta o estado original', () => {
    const s = seed();
    const antes = s.equipes.find((e) => e.id === 'eq-1')!.etapaAtualId;
    moverEquipeParaEtapa(s, 'eq-1', { destino: 4, autorId: 'u-mentor-1', forcar: true });
    expect(s.equipes.find((e) => e.id === 'eq-1')!.etapaAtualId).toBe(antes);
  });
});

const HOJE = '2026-09-03';

describe('serieSemanalMentor', () => {
  it('retorna exatamente N semanas, da mais antiga para a mais recente', () => {
    const s = seed();
    const serie = serieSemanalMentor(s, mentor1(s), HOJE, 8);
    expect(serie).toHaveLength(8);
    for (let i = 1; i < serie.length; i++) {
      expect(serie[i].semanaInicio >= serie[i - 1].semanaInicio).toBe(true);
    }
  });

  it('conta um avanço da equipe do mentor na semana corrente', () => {
    const s = seed();
    const base = serieSemanalMentor(s, mentor1(s), HOJE, 8);
    const avanco: HistoricoEtapa = {
      id: 'h-teste',
      equipeId: 'eq-1', // mentor u-mentor-1
      etapaOrigemId: 1,
      etapaDestinoId: 2,
      movidoPor: 'u-mentor-1',
      forcado: false,
      criadoEm: '2026-09-01T10:00:00.000Z', // 2 dias antes de HOJE → última semana
    };
    const s2: AppState = { ...s, historico: [...s.historico, avanco] };
    const mod = serieSemanalMentor(s2, mentor1(s), HOJE, 8);
    expect(mod[7].avancos).toBe(base[7].avancos + 1);
  });

  it('ignora avanços de equipes de outro mentor', () => {
    const s = seed();
    const base = serieSemanalMentor(s, mentor1(s), HOJE, 8);
    const avanco: HistoricoEtapa = {
      id: 'h-teste',
      equipeId: 'eq-3', // mentor u-mentor-2
      etapaOrigemId: 3,
      etapaDestinoId: 4,
      movidoPor: 'u-mentor-2',
      forcado: false,
      criadoEm: '2026-09-01T10:00:00.000Z',
    };
    const s2: AppState = { ...s, historico: [...s.historico, avanco] };
    const mod = serieSemanalMentor(s2, mentor1(s), HOJE, 8);
    expect(mod[7].avancos).toBe(base[7].avancos);
  });

  it('conta uma entrega concluída (concluidaEm) da equipe do mentor', () => {
    const s = seed();
    const base = serieSemanalMentor(s, mentor1(s), HOJE, 8);
    const tarefa: Tarefa = {
      id: 't-teste',
      equipeId: 'eq-1',
      etapaId: 1,
      titulo: 'Teste',
      descricao: '',
      obrigatoria: false,
      status: 'aprovada',
      dataEntrega: '2026-08-25',
      criadoEm: '2026-08-20T10:00:00.000Z',
      concluidaEm: '2026-09-02T10:00:00.000Z', // última semana
    };
    const s2: AppState = { ...s, tarefas: [...s.tarefas, tarefa] };
    const mod = serieSemanalMentor(s2, mentor1(s), HOJE, 8);
    expect(mod[7].entregas).toBe(base[7].entregas + 1);
  });

  it('ignora eventos fora da janela (mais antigos que N semanas)', () => {
    const s = seed();
    const base = serieSemanalMentor(s, mentor1(s), HOJE, 8);
    const avanco: HistoricoEtapa = {
      id: 'h-antigo',
      equipeId: 'eq-1',
      etapaOrigemId: 1,
      etapaDestinoId: 2,
      movidoPor: 'u-mentor-1',
      forcado: false,
      criadoEm: '2026-01-01T10:00:00.000Z', // muito antigo
    };
    const s2: AppState = { ...s, historico: [...s.historico, avanco] };
    const mod = serieSemanalMentor(s2, mentor1(s), HOJE, 8);
    const totalBase = base.reduce((a, p) => a + p.avancos, 0);
    const totalMod = mod.reduce((a, p) => a + p.avancos, 0);
    expect(totalMod).toBe(totalBase);
  });
});
