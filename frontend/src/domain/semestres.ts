// Período do aluno no curso. Os cursos da AMF não usam a mesma nomenclatura —
// uns contam semestres, outros módulos — então o rótulo é sempre
// "Semestre/Módulo" e a escolha é feita numa lista fechada, para o filtro e os
// relatórios da coordenação não dependerem de texto livre.

/** Períodos possíveis (1 a 10), como valores de formulário. */
export const SEMESTRES = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
] as const;

export type Semestre = (typeof SEMESTRES)[number];

/** Rótulo do campo — vale para cursos por semestre e por módulo. */
export const SEMESTRE_LABEL = 'Semestre/Módulo';

/** Opções `{ value, label }` do período para uso em `<Select>`. */
export const SEMESTRE_OPTIONS = SEMESTRES.map((s) => ({
  value: s,
  label: `${s}º semestre/módulo`,
}));

/** Forma curta usada em listas e cartões: `3º`. Vazio quando não informado. */
export function semestreCurto(semestre?: string): string {
  return semestre && semestre.trim() !== '' ? `${semestre.trim()}º` : '';
}
