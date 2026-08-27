import { describe, it, expect } from 'vitest';
import { seed } from '@/data/fixtures';

describe('seed()', () => {
  it('tem exatamente 6 etapas numeradas de 1 a 6', () => {
    const s = seed();
    expect(s.etapas).toHaveLength(6);
    expect(s.etapas.map((e) => e.numero).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('tem ao menos 1 admin, 1 mentor e 2 alunos', () => {
    const s = seed();
    expect(s.usuarios.some((u) => u.tipo === 'admin')).toBe(true);
    expect(s.usuarios.some((u) => u.tipo === 'mentor')).toBe(true);
    expect(s.usuarios.filter((u) => u.tipo === 'aluno').length).toBeGreaterThanOrEqual(2);
  });

  it('tem ao menos 6 equipes', () => {
    expect(seed().equipes.length).toBeGreaterThanOrEqual(6);
  });

  it('tem ao menos uma equipe pronta para o InovAMF', () => {
    const prontas = seed().equipes.filter((e) => e.status === 'pronta_inovamf');
    expect(prontas.length).toBeGreaterThanOrEqual(1);
    expect(prontas[0].prontaInovamfEm).toBeTruthy();
  });

  it('tem ao menos uma tarefa atrasada e uma entrega avaliada', () => {
    const s = seed();
    expect(s.tarefas.some((t) => t.status === 'atrasada')).toBe(true);
    expect(s.entregas.length).toBeGreaterThanOrEqual(1);
    expect(s.avaliacoes.length).toBeGreaterThanOrEqual(1);
    // a entrega avaliada aponta para uma tarefa existente
    const entrega = s.entregas.find((e) =>
      s.avaliacoes.some((a) => a.entregaId === e.id),
    );
    expect(entrega).toBeTruthy();
    expect(s.tarefas.some((t) => t.id === entrega!.tarefaId)).toBe(true);
  });

  it('retorna um estado fresco a cada chamada (sem referência compartilhada)', () => {
    const a = seed();
    const b = seed();
    expect(a).not.toBe(b);
    expect(a.equipes).not.toBe(b.equipes);
  });
});
