/**
 * Conteúdo da landing pública.
 *
 * As etapas e áreas são conteúdo institucional estável do programa — os
 * mesmos dados de referência semeados no backend (ver
 * `backend/prisma/migrations/20260917120200_seed_referencia`) — por isso
 * ficam estáticos aqui em vez de vir de um endpoint (os que existem,
 * `/etapas-funil` e `/areas-ideia`, são só leitura e raramente mudam; não
 * vale o custo de um fetch client-side numa página pública só por isso).
 *
 * Os casos e equipes em destaque são copy ilustrativa da vitrine — não há
 * endpoint público de listagem de equipes (a listagem exige sessão
 * autenticada), então esse conteúdo é estático e não reflete dados ao vivo,
 * por decisão do dono do produto. Os números do hero, esses sim, são reais:
 * ver `NumerosVitrine` (GET /publico/numeros).
 */

export interface EtapaVitrine {
  numero: number;
  nome: string;
  /** Uma frase do que acontece na etapa (tela da etapa em "Como funciona"). */
  descricao: string;
  entregavel: string;
}

export interface CasoVitrine {
  id: string;
  nomeIdeia: string;
  descricao: string;
  area: string;
  status: string;
  integrantes: number;
  cursos: string[];
}

/** As 6 etapas da jornada InfoHub → InovAMF, com o entregável de cada uma. */
export const ETAPAS_VITRINE: EtapaVitrine[] = [
  { numero: 1, nome: 'Envio da ideia', descricao: 'Você conta a ideia no formulário inicial, mesmo que ainda esteja crua. A conta de acesso é criada na hora.', entregavel: 'Cadastro da ideia (formulário)' },
  { numero: 2, nome: 'Contato com a equipe', descricao: 'A equipe InfoHub analisa a proposta e agenda o primeiro encontro com vocês.', entregavel: 'Agendamento confirmado' },
  { numero: 3, nome: 'Encontro 1 – Entendendo a ideia', descricao: 'Mentor e equipe definem o problema, o público-alvo e a solução inicial.', entregavel: 'Problema, público-alvo e solução definidos' },
  { numero: 4, nome: 'Encontro 2 – Proposta de valor', descricao: 'Vocês constroem o Value Proposition Design com o mentor.', entregavel: 'Value Proposition Design' },
  { numero: 5, nome: 'Encontro 3 – Modelo de negócio', descricao: 'É a vez do Business Model Canvas: como a ideia gera valor e se sustenta.', entregavel: 'Business Model Canvas' },
  { numero: 6, nome: 'Encontro 4 – Pitch e inscrição', descricao: 'Revisão geral, gravação do Pitch Vídeo e conferência dos documentos. A equipe fica pronta para o InovAMF.', entregavel: 'Pitch Vídeo, Canvas final, VPD final, dados de todos os integrantes' },
];

/** Áreas de atuação aceitas nas ideias (lista configurável — RF, seção 4.2). */
export const AREAS_VITRINE: string[] = [
  'Educação',
  'Saúde',
  'Tecnologia',
  'Sustentabilidade',
];

/** Equipes que chegaram ao fim do funil — a vitrine de casos do programa. */
export const CASOS_VITRINE: CasoVitrine[] = [
  {
    id: 'caso-1',
    nomeIdeia: 'SolarGrid',
    descricao: 'Gestão comunitária de energia solar compartilhada.',
    area: 'Sustentabilidade',
    status: 'Pronta p/ InovAMF',
    integrantes: 2,
    cursos: ['Sistemas de Informação', 'Ciências Contábeis'],
  },
  {
    id: 'caso-2',
    nomeIdeia: 'MedTrack',
    descricao: 'Acompanhamento de adesão a tratamentos crônicos por lembretes inteligentes.',
    area: 'Saúde',
    status: 'Pronta p/ InovAMF',
    integrantes: 1,
    cursos: ['Ontopsicologia'],
  },
  {
    id: 'caso-3',
    nomeIdeia: 'LexData',
    descricao: 'Painel de indicadores para departamentos jurídicos.',
    area: 'Tecnologia',
    status: 'Pronta p/ InovAMF',
    integrantes: 2,
    cursos: ['Sistemas de Informação'],
  },
  {
    id: 'caso-4',
    nomeIdeia: 'EduPonte',
    descricao: 'Mentoria entre veteranos e calouros por trilhas de estudo.',
    area: 'Educação',
    status: 'Pronta p/ InovAMF',
    integrantes: 3,
    cursos: ['Pedagogia', 'Administração'],
  },
];

/** Equipes em andamento, mostradas como "quem está no programa agora". */
export const EQUIPES_VITRINE: CasoVitrine[] = [
  {
    id: 'equipe-1',
    nomeIdeia: 'AgroSmart',
    descricao: 'Sensores de baixo custo para irrigação inteligente na agricultura familiar.',
    area: 'Tecnologia',
    status: 'Etapa 3',
    integrantes: 2,
    cursos: ['Sistemas de Informação', 'Administração'],
  },
  {
    id: 'equipe-2',
    nomeIdeia: 'FinLingo',
    descricao: 'Educação financeira para jovens via microlições diárias.',
    area: 'Tecnologia',
    status: 'Etapa 5',
    integrantes: 2,
    cursos: ['Administração', 'Sistemas de Informação'],
  },
  {
    id: 'equipe-3',
    nomeIdeia: 'SaborEscola',
    descricao: 'Educação alimentar para crianças com receitas guiadas em vídeo.',
    area: 'Educação',
    status: 'Etapa 3',
    integrantes: 2,
    cursos: ['Gastronomia', 'Pedagogia'],
  },
  {
    id: 'equipe-4',
    nomeIdeia: 'ReciclaAI',
    descricao: 'Marketplace que conecta catadores a cooperativas de reciclagem.',
    area: 'Sustentabilidade',
    status: 'Etapa 4',
    integrantes: 1,
    cursos: ['Administração'],
  },
];

/**
 * Foto da AMF no card "Aberto a todos os cursos" (opção 2b: a foto ocupa o
 * card inteiro, com véu). Precisa de direito de uso; enquanto não houver, o
 * card usa o fundo quente da marca. Para ligar: salve a imagem em
 * `frontend/public/landing/` e aponte aqui (ex.: '/landing/amf-campus.webp').
 */
export const FOTO_AMF: { src: string; alt: string } | null = null;

/** Endereço e contato oficiais da AMF (confirmados pelo dono do produto, 23/09). */
export const CONTATO_AMF = {
  instituicao: 'Faculdade Antonio Meneghetti (AMF)',
  linhas: [
    'Estrada Recanto Maestro, nº 338',
    'Distrito Recanto Maestro',
    'Restinga Sêca – RS · CEP 97200-000',
  ],
  telefones: ['(55) 3289-1139', '(55) 99998-0696'],
};
