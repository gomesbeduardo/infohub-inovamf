// Cursos de graduação ofertados pela AMF (Faculdade Antonio Meneghetti).
// Fonte única para o formulário de cadastro e para o filtro de curso do funil,
// de modo que aluno e coordenação trabalhem sempre com a mesma lista.

/** Cursos de graduação ofertados pela AMF, em ordem alfabética (pt-BR). */
export const CURSOS_AMF = [
  'Administração',
  'Ciências Contábeis',
  'Direito',
  'Gastronomia',
  'Hotelaria',
  'Ontopsicologia',
  'Pedagogia',
  'Sistemas de Informação',
] as const;

export type CursoAMF = (typeof CURSOS_AMF)[number];

/** Opções `{ value, label }` dos cursos da AMF para uso em `<Select>`. */
export const CURSO_OPTIONS = CURSOS_AMF.map((c) => ({ value: c, label: c }));
