import type { AppState } from '@/domain/types';

/**
 * Estado inicial (seed) do app mockado. Retorna sempre um objeto novo — nenhuma
 * referência é compartilhada entre chamadas, para que os testes e o store
 * possam partir de um estado limpo. IDs são strings/números fixos (sem random),
 * de modo que o seed seja determinístico.
 *
 * Cursos: todos os membros usam apenas cursos ofertados pela AMF
 * (ver `src/domain/cursos.ts`).
 *
 * Distribuição: os dados são propositalmente *desiguais*, simulando uso real —
 * um funil que afunila (muitas equipes no início, poucas no fim), cursos e áreas
 * com pesos diferentes, mentores com carga desigual (um sem mentor ainda),
 * equipes de tamanhos variados e tarefas concentradas em algumas equipes.
 *   Equipes ativas por etapa (1→6): 5, 3, 3, 1, 2, 1.
 *
 * Referência de "hoje" nas datas: ciclo 2026/2 (agosto/2026). O ciclo 2026/1
 * (id 2) é a turma anterior, já encerrada, com status variados (encaminhada,
 * pausada, desistente) para exercitar filtros e relatórios.
 */
export function seed(): AppState {
  return {
    usuarios: [
      { id: 'u-admin', nome: 'Admin InfoHub', email: 'admin@infohub.dev', senha: '123456', telefone: '(55) 99999-0001', tipo: 'admin', ativo: true },
      { id: 'u-mentor-1', nome: 'Marina Mentora', email: 'mentor@infohub.dev', senha: '123456', telefone: '(55) 99999-0002', tipo: 'mentor', ativo: true },
      { id: 'u-mentor-2', nome: 'Otávio Mentor', email: 'otavio@infohub.dev', senha: '123456', telefone: '(55) 99999-0003', tipo: 'mentor', ativo: true },
      { id: 'u-mentor-3', nome: 'Priscila Orientadora', email: 'priscila@infohub.dev', senha: '123456', telefone: '(55) 99999-0004', tipo: 'mentor', ativo: true },
      { id: 'u-aluno-1', nome: 'Ana Souza', email: 'ana@infohub.dev', senha: '123456', telefone: '(55) 98888-0001', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-2', nome: 'Bruno Lima', email: 'bruno@infohub.dev', senha: '123456', telefone: '(55) 98888-0002', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-3', nome: 'Carla Nunes', email: 'aluno@infohub.dev', senha: '123456', telefone: '(55) 98888-0003', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-4', nome: 'Diego Alves', email: 'diego@infohub.dev', senha: '123456', telefone: '(55) 98888-0004', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-5', nome: 'Elisa Prado', email: 'elisa@infohub.dev', senha: '123456', telefone: '(55) 98888-0005', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-6', nome: 'Felipe Rocha', email: 'felipe@infohub.dev', senha: '123456', telefone: '(55) 98888-0006', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-7', nome: 'Gabriela Dias', email: 'gabriela@infohub.dev', senha: '123456', telefone: '(55) 98888-0007', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-8', nome: 'Helena Castro', email: 'helena@infohub.dev', senha: '123456', telefone: '(55) 98888-0008', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-9', nome: 'Júlia Ferraz', email: 'julia@infohub.dev', senha: '123456', telefone: '(55) 98888-0009', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-10', nome: 'Camila Rosa', email: 'camila@infohub.dev', senha: '123456', telefone: '(55) 98888-0010', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-11', nome: 'Sofia Ramos', email: 'sofia@infohub.dev', senha: '123456', telefone: '(55) 98888-0011', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-12', nome: 'Beatriz Lima', email: 'beatriz@infohub.dev', senha: '123456', telefone: '(55) 98888-0012', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-13', nome: 'Larissa Gomes', email: 'larissa@infohub.dev', senha: '123456', telefone: '(55) 98888-0013', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-14', nome: 'Rodrigo Melo', email: 'rodrigo@infohub.dev', senha: '123456', telefone: '(55) 98888-0014', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-15', nome: 'Marina Prado', email: 'marinap@infohub.dev', senha: '123456', telefone: '(55) 98888-0015', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-16', nome: 'Natália Reis', email: 'natalia@infohub.dev', senha: '123456', telefone: '(55) 98888-0016', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-17', nome: 'Gustavo Sá', email: 'gustavo@infohub.dev', senha: '123456', telefone: '(55) 98888-0017', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-18', nome: 'Marcela Vidal', email: 'marcela@infohub.dev', senha: '123456', telefone: '(55) 98888-0018', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-19', nome: 'Renata Dias', email: 'renata@infohub.dev', senha: '123456', telefone: '(55) 98888-0019', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-20', nome: 'Fábio Nunes', email: 'fabio@infohub.dev', senha: '123456', telefone: '(55) 98888-0020', tipo: 'aluno', ativo: false },
    ],
    alunos: [
      { usuarioId: 'u-aluno-1', curso: 'Pedagogia', semestre: '4' },
      { usuarioId: 'u-aluno-2', curso: 'Ontopsicologia', semestre: '6' },
      { usuarioId: 'u-aluno-3', curso: 'Sistemas de Informação', semestre: '5' },
      { usuarioId: 'u-aluno-4', curso: 'Administração', semestre: '7' },
      { usuarioId: 'u-aluno-5', curso: 'Administração', semestre: '3' },
      { usuarioId: 'u-aluno-6', curso: 'Ontopsicologia', semestre: '8' },
      { usuarioId: 'u-aluno-7', curso: 'Sistemas de Informação', semestre: '9' },
      { usuarioId: 'u-aluno-8', curso: 'Direito', semestre: '5' },
      { usuarioId: 'u-aluno-9', curso: 'Gastronomia', semestre: '2' },
      { usuarioId: 'u-aluno-10', curso: 'Hotelaria', semestre: '4' },
      { usuarioId: 'u-aluno-11', curso: 'Ciências Contábeis', semestre: '6' },
      { usuarioId: 'u-aluno-12', curso: 'Pedagogia', semestre: '1' },
      { usuarioId: 'u-aluno-13', curso: 'Hotelaria', semestre: '7' },
      { usuarioId: 'u-aluno-14', curso: 'Administração', semestre: '3' },
      { usuarioId: 'u-aluno-15', curso: 'Gastronomia', semestre: '' },
      { usuarioId: 'u-aluno-16', curso: 'Ontopsicologia', semestre: '8' },
      { usuarioId: 'u-aluno-17', curso: 'Direito', semestre: '10' },
      { usuarioId: 'u-aluno-18', curso: 'Sistemas de Informação', semestre: '5' },
      { usuarioId: 'u-aluno-19', curso: 'Gastronomia', semestre: '6' },
      { usuarioId: 'u-aluno-20', curso: 'Ciências Contábeis', semestre: '4' },
    ],
    areas: [
      { id: 1, nome: 'Educação' },
      { id: 2, nome: 'Saúde' },
      { id: 3, nome: 'Tecnologia' },
      { id: 4, nome: 'Sustentabilidade' },
    ],
    etapas: [
      { id: 1, numero: 1, nome: 'Envio da ideia', entregavel: 'Cadastro da ideia (formulário)' },
      { id: 2, numero: 2, nome: 'Contato com a equipe', entregavel: 'Agendamento confirmado' },
      { id: 3, numero: 3, nome: 'Encontro 1 – Entendendo a ideia', entregavel: 'Problema, público-alvo e solução definidos' },
      { id: 4, numero: 4, nome: 'Encontro 2 – Proposta de valor', entregavel: 'Value Proposition Design' },
      { id: 5, numero: 5, nome: 'Encontro 3 – Modelo de negócio', entregavel: 'Business Model Canvas' },
      { id: 6, numero: 6, nome: 'Encontro 4 – Pitch e inscrição', entregavel: 'Pitch Vídeo, Canvas final, VPD final, dados de todos os integrantes' },
    ],
    ciclos: [
      { id: 1, nome: '2026/2' },
      { id: 2, nome: '2026/1' },
    ],
    equipes: [
      // ── Ciclo 2026/2 (atual) ────────────────────────────────────────────────
      // Etapa 1 — topo do funil (5 equipes)
      {
        id: 'eq-1', nomeIdeia: 'EcoAula', slug: 'ecoaula', descricaoIdeia: 'Plataforma que leva educação ambiental gamificada para escolas públicas.',
        areaId: 1, estagioIdeia: 'ideia', origemDivulgacao: 'Instagram', mentorId: 'u-mentor-1', cicloId: 1, etapaAtualId: 1, status: 'ativa',
        criadoEm: '2026-08-25T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-1', nome: 'Ana Souza', curso: 'Pedagogia', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq1-2', nome: 'Rafael Teixeira', curso: 'Pedagogia', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-8', nomeIdeia: 'JurisFácil', slug: 'jurisfacil', descricaoIdeia: 'Orientação jurídica gratuita e guiada para pequenos empreendedores.',
        areaId: 1, estagioIdeia: 'ideia', origemDivulgacao: 'Indicação de professor', mentorId: 'u-mentor-3', cicloId: 1, etapaAtualId: 1, status: 'ativa',
        criadoEm: '2026-08-24T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-8', nome: 'Helena Castro', curso: 'Direito', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq8-2', nome: 'Marcelo Pires', curso: 'Direito', papel: 'integrante', ativo: true },
          { usuarioId: 'm-eq8-3', nome: 'Bianca Lopes', curso: 'Direito', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-9', nomeIdeia: 'SaborLocal', slug: 'saborlocal', descricaoIdeia: 'Marketplace que conecta produtores locais e chefs para reduzir desperdício.',
        areaId: 4, estagioIdeia: 'ideia', origemDivulgacao: 'Instagram', mentorId: 'u-mentor-3', cicloId: 1, etapaAtualId: 1, status: 'ativa',
        criadoEm: '2026-08-26T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-9', nome: 'Júlia Ferraz', curso: 'Gastronomia', papel: 'lider', ativo: true },
        ],
      },
      {
        id: 'eq-10', nomeIdeia: 'HospedaBem', slug: 'hospedabem', descricaoIdeia: 'App de gestão de reservas e diárias para pequenas pousadas do interior.',
        areaId: 3, estagioIdeia: 'ideia', origemDivulgacao: 'Evento InfoHub', mentorId: 'u-mentor-2', cicloId: 1, etapaAtualId: 1, status: 'ativa',
        criadoEm: '2026-08-23T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-10', nome: 'Camila Rosa', curso: 'Hotelaria', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq10-2', nome: 'Vitor Nunes', curso: 'Sistemas de Informação', papel: 'integrante', ativo: true },
        ],
      },
      {
        // Equipe recém-chegada, ainda sem mentor atribuído.
        id: 'eq-11', nomeIdeia: 'ContaCerta', slug: 'contacerta', descricaoIdeia: 'Automação contábil simples para microempreendedores individuais.',
        areaId: 3, estagioIdeia: 'ideia', origemDivulgacao: 'Feira de inovação', cicloId: 1, etapaAtualId: 1, status: 'ativa',
        criadoEm: '2026-08-28T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-11', nome: 'Sofia Ramos', curso: 'Ciências Contábeis', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq11-2', nome: 'André Luz', curso: 'Administração', papel: 'integrante', ativo: true },
          { usuarioId: 'm-eq11-3', nome: 'Marina Alves', curso: 'Administração', papel: 'integrante', ativo: true },
        ],
      },
      // Etapa 2 (3 equipes)
      {
        id: 'eq-2', nomeIdeia: 'SaúdeJá', slug: 'saudeja', descricaoIdeia: 'App de triagem rápida para postos de saúde do interior.',
        areaId: 2, estagioIdeia: 'ideia', origemDivulgacao: 'Indicação de professor', mentorId: 'u-mentor-1', cicloId: 1, etapaAtualId: 2, status: 'ativa',
        criadoEm: '2026-08-18T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-2', nome: 'Bruno Lima', curso: 'Ontopsicologia', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq2-2', nome: 'Paula Martins', curso: 'Ontopsicologia', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-12', nomeIdeia: 'EduLibras', slug: 'edulibras', descricaoIdeia: 'Ferramenta que ensina Libras a educadores por microdesafios diários.',
        areaId: 1, estagioIdeia: 'prototipo', origemDivulgacao: 'Instagram', mentorId: 'u-mentor-1', cicloId: 1, etapaAtualId: 2, status: 'ativa',
        criadoEm: '2026-08-16T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-12', nome: 'Beatriz Lima', curso: 'Pedagogia', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq12-2', nome: 'Caio Souza', curso: 'Sistemas de Informação', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-13', nomeIdeia: 'TurisTrilhas', slug: 'turistrilhas', descricaoIdeia: 'Roteiros de turismo rural com curadoria de experiências gastronômicas.',
        areaId: 3, estagioIdeia: 'ideia', origemDivulgacao: 'Feira de inovação', mentorId: 'u-mentor-3', cicloId: 1, etapaAtualId: 2, status: 'ativa',
        criadoEm: '2026-08-14T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-13', nome: 'Larissa Gomes', curso: 'Hotelaria', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq13-2', nome: 'Pedro Antunes', curso: 'Gastronomia', papel: 'integrante', ativo: true },
        ],
      },
      // Etapa 3 (3 equipes)
      {
        id: 'eq-3', nomeIdeia: 'AgroSmart', slug: 'agrosmart', descricaoIdeia: 'Sensores de baixo custo para irrigação inteligente na agricultura familiar.',
        areaId: 3, estagioIdeia: 'prototipo', origemDivulgacao: 'Feira de inovação', mentorId: 'u-mentor-2', cicloId: 1, etapaAtualId: 3, status: 'ativa',
        criadoEm: '2026-08-10T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-3', nome: 'Carla Nunes', curso: 'Sistemas de Informação', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq3-2', nome: 'Thiago Barros', curso: 'Administração', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-14', nomeIdeia: 'AgendaFácil', slug: 'agendafacil', descricaoIdeia: 'Agendamento inteligente para salões e prestadores autônomos.',
        areaId: 3, estagioIdeia: 'prototipo', origemDivulgacao: 'Indicação de aluno', mentorId: 'u-mentor-1', cicloId: 1, etapaAtualId: 3, status: 'ativa',
        criadoEm: '2026-08-09T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-14', nome: 'Rodrigo Melo', curso: 'Administração', papel: 'lider', ativo: true },
        ],
      },
      {
        id: 'eq-15', nomeIdeia: 'SaborEscola', slug: 'saborescola', descricaoIdeia: 'Educação alimentar para crianças com receitas guiadas em vídeo.',
        areaId: 1, estagioIdeia: 'prototipo', origemDivulgacao: 'Instagram', mentorId: 'u-mentor-2', cicloId: 1, etapaAtualId: 3, status: 'ativa',
        criadoEm: '2026-08-08T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-15', nome: 'Marina Prado', curso: 'Gastronomia', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq15-2', nome: 'Tiago Ferreira', curso: 'Pedagogia', papel: 'integrante', ativo: true },
        ],
      },
      // Etapa 4 (1 equipe)
      {
        id: 'eq-4', nomeIdeia: 'ReciclaAI', slug: 'reciclaai', descricaoIdeia: 'Marketplace que conecta catadores a cooperativas de reciclagem.',
        areaId: 4, estagioIdeia: 'prototipo', origemDivulgacao: 'Evento InfoHub', mentorId: 'u-mentor-2', cicloId: 1, etapaAtualId: 4, status: 'ativa',
        criadoEm: '2026-08-06T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-4', nome: 'Diego Alves', curso: 'Administração', papel: 'lider', ativo: true },
        ],
      },
      // Etapa 5 (2 equipes)
      {
        id: 'eq-5', nomeIdeia: 'FinLingo', slug: 'finlingo', descricaoIdeia: 'Educação financeira para jovens via microlições diárias.',
        areaId: 3, estagioIdeia: 'mvp_desenvolvimento', origemDivulgacao: 'Instagram', mentorId: 'u-mentor-1', cicloId: 1, etapaAtualId: 5, status: 'ativa',
        criadoEm: '2026-08-02T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-5', nome: 'Elisa Prado', curso: 'Administração', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq5-2', nome: 'Igor Souza', curso: 'Sistemas de Informação', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-16', nomeIdeia: 'MenteViva', slug: 'menteviva', descricaoIdeia: 'Rede de apoio emocional entre pares com acompanhamento profissional.',
        areaId: 2, estagioIdeia: 'mvp_desenvolvimento', origemDivulgacao: 'Indicação de aluno', mentorId: 'u-mentor-1', cicloId: 1, etapaAtualId: 5, status: 'ativa',
        criadoEm: '2026-08-01T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-16', nome: 'Natália Reis', curso: 'Ontopsicologia', papel: 'lider', ativo: true },
        ],
      },
      // Etapa 6 (1 equipe ativa)
      {
        id: 'eq-6', nomeIdeia: 'MedTrack', slug: 'medtrack', descricaoIdeia: 'Acompanhamento de adesão a tratamentos crônicos por lembretes inteligentes.',
        areaId: 2, estagioIdeia: 'mvp_desenvolvimento', origemDivulgacao: 'Indicação de aluno', mentorId: 'u-mentor-2', cicloId: 1, etapaAtualId: 6, status: 'ativa',
        criadoEm: '2026-07-30T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-6', nome: 'Felipe Rocha', curso: 'Ontopsicologia', papel: 'lider', ativo: true },
        ],
      },
      // Prontas para o InovAMF (2)
      {
        id: 'eq-7', nomeIdeia: 'SolarGrid', slug: 'solargrid', descricaoIdeia: 'Gestão comunitária de energia solar compartilhada.',
        areaId: 4, estagioIdeia: 'mvp_pronto', origemDivulgacao: 'Feira de inovação', mentorId: 'u-mentor-1', cicloId: 1, etapaAtualId: 6, status: 'pronta_inovamf',
        prontaInovamfEm: '2026-08-22T13:00:00.000Z', criadoEm: '2026-07-25T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-7', nome: 'Gabriela Dias', curso: 'Sistemas de Informação', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq7-2', nome: 'Lucas Fontes', curso: 'Ciências Contábeis', papel: 'integrante', ativo: true },
        ],
      },
      // ── Ciclo 2026/1 (turma anterior, encerrada) ────────────────────────────
      {
        id: 'eq-17', nomeIdeia: 'AdvExpress', slug: 'advexpress', descricaoIdeia: 'Assistente que agiliza a triagem de processos em escritórios pequenos.',
        areaId: 1, estagioIdeia: 'mvp_pronto', origemDivulgacao: 'Evento InfoHub', mentorId: 'u-mentor-1', cicloId: 2, etapaAtualId: 6, status: 'encaminhada_inovamf',
        prontaInovamfEm: '2026-03-18T13:00:00.000Z', criadoEm: '2026-02-10T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-17', nome: 'Gustavo Sá', curso: 'Direito', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq17-2', nome: 'Tânia Mota', curso: 'Direito', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-18', nomeIdeia: 'LexData', slug: 'lexdata', descricaoIdeia: 'Painel de indicadores para departamentos jurídicos.',
        areaId: 3, estagioIdeia: 'mvp_desenvolvimento', origemDivulgacao: 'Indicação de professor', mentorId: 'u-mentor-1', cicloId: 2, etapaAtualId: 6, status: 'pronta_inovamf',
        prontaInovamfEm: '2026-03-20T13:00:00.000Z', criadoEm: '2026-02-12T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-18', nome: 'Marcela Vidal', curso: 'Sistemas de Informação', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq18-2', nome: 'Rafael Pinto', curso: 'Sistemas de Informação', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-19', nomeIdeia: 'GastroTruck', slug: 'gastrotruck', descricaoIdeia: 'Gestão financeira e de rotas para food trucks colaborativos.',
        areaId: 4, estagioIdeia: 'prototipo', origemDivulgacao: 'Instagram', mentorId: 'u-mentor-2', cicloId: 2, etapaAtualId: 4, status: 'pausada',
        criadoEm: '2026-02-14T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-19', nome: 'Renata Dias', curso: 'Gastronomia', papel: 'lider', ativo: true },
        ],
      },
      {
        id: 'eq-20', nomeIdeia: 'ContaFlow', slug: 'contaflow', descricaoIdeia: 'Planejamento financeiro pessoal com metas guiadas.',
        areaId: 3, estagioIdeia: 'ideia', origemDivulgacao: 'Indicação de professor', mentorId: 'u-mentor-3', cicloId: 2, etapaAtualId: 2, status: 'desistente',
        criadoEm: '2026-02-20T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-20', nome: 'Fábio Nunes', curso: 'Ciências Contábeis', papel: 'lider', ativo: false },
        ],
      },
    ],
    historico: [
      { id: 'h-1', equipeId: 'eq-7', etapaOrigemId: 4, etapaDestinoId: 5, movidoPor: 'u-mentor-1', forcado: false, criadoEm: '2026-08-12T13:00:00.000Z' },
      { id: 'h-2', equipeId: 'eq-7', etapaOrigemId: 5, etapaDestinoId: 6, movidoPor: 'u-mentor-1', forcado: false, criadoEm: '2026-08-18T13:00:00.000Z' },
      { id: 'h-3', equipeId: 'eq-7', etapaOrigemId: 6, etapaDestinoId: 6, movidoPor: 'u-mentor-1', forcado: false, observacao: 'Concluiu a etapa 6 e ficou pronta para o InovAMF.', criadoEm: '2026-08-22T13:00:00.000Z' },
      { id: 'h-4', equipeId: 'eq-3', etapaOrigemId: 2, etapaDestinoId: 3, movidoPor: 'u-mentor-2', forcado: true, observacao: 'Avançada com pendência para não travar o cronograma.', criadoEm: '2026-08-15T13:00:00.000Z' },
      { id: 'h-5', equipeId: 'eq-17', etapaOrigemId: 6, etapaDestinoId: 6, movidoPor: 'u-admin', forcado: false, observacao: 'Encaminhada ao InovAMF no ciclo 2026/1.', criadoEm: '2026-03-18T13:00:00.000Z' },
    ],
    anotacoes: [
      { id: 'an-1', equipeId: 'eq-3', etapaId: 3, autorId: 'u-mentor-2', conteudo: 'Time engajado; falta fechar a definição de público-alvo.', criadoEm: '2026-08-19T13:00:00.000Z' },
      { id: 'an-2', equipeId: 'eq-8', etapaId: 1, autorId: 'u-mentor-3', conteudo: 'Duas entregas atrasadas logo na etapa 1; acionar a líder com urgência.', criadoEm: '2026-08-27T13:00:00.000Z' },
      { id: 'an-3', equipeId: 'eq-10', etapaId: 1, autorId: 'u-mentor-2', conteudo: 'Boa validação com uma pousada piloto; potencial forte.', criadoEm: '2026-08-25T13:00:00.000Z' },
      { id: 'an-4', equipeId: 'eq-19', autorId: 'u-mentor-2', conteudo: 'Equipe pausou por conflito de agenda no ciclo anterior.', criadoEm: '2026-04-02T13:00:00.000Z' },
    ],
    modelosTarefa: [
      { id: 1, etapaId: 1, titulo: 'Revisar cadastro da ideia', descricao: 'Conferir se a descrição da ideia está clara.', obrigatoria: false, prazoPadraoDias: 3 },
      { id: 2, etapaId: 2, titulo: 'Confirmar agendamento do 1º encontro', obrigatoria: true, prazoPadraoDias: 5 },
      { id: 3, etapaId: 3, titulo: 'Definir problema e público-alvo', descricao: 'Registrar problema, público-alvo e solução inicial.', obrigatoria: true, prazoPadraoDias: 7 },
      { id: 4, etapaId: 4, titulo: 'Montar o Value Proposition Design', obrigatoria: true, prazoPadraoDias: 10 },
      { id: 5, etapaId: 5, titulo: 'Enviar o Business Model Canvas', descricao: 'Modelo de negócio completo no template do InfoHub.', obrigatoria: true, prazoPadraoDias: 10 },
      { id: 6, etapaId: 6, titulo: 'Gravar o Pitch Vídeo', obrigatoria: true, prazoPadraoDias: 7 },
      { id: 7, etapaId: 6, titulo: 'Conferir documentos de todos os integrantes', obrigatoria: true, prazoPadraoDias: 5 },
    ],
    // Tarefas concentradas em poucas equipes (uso real): algumas equipes têm
    // várias e atrasadas, outras nenhuma.
    tarefas: [
      { id: 't-1', equipeId: 'eq-3', etapaId: 3, titulo: 'Definir problema e público-alvo', descricao: 'Registrar problema, público-alvo e solução inicial.', obrigatoria: true, dataEntrega: '2026-08-20', status: 'atrasada', criadoPor: 'u-mentor-2' },
      { id: 't-2', equipeId: 'eq-3', etapaId: 3, titulo: 'Levantar concorrentes diretos', obrigatoria: false, dataEntrega: '2026-09-05', status: 'pendente', criadoPor: 'u-mentor-2' },
      { id: 't-3', equipeId: 'eq-5', etapaId: 5, titulo: 'Enviar o Business Model Canvas', descricao: 'Modelo de negócio completo no template do InfoHub.', obrigatoria: true, dataEntrega: '2026-08-15', status: 'aprovada', criadoPor: 'u-mentor-1', concluidaEm: '2026-08-16T13:00:00.000Z' },
      { id: 't-4', equipeId: 'eq-5', etapaId: 5, titulo: 'Revisar a precificação', obrigatoria: false, dataEntrega: '2026-09-10', status: 'em_andamento', criadoPor: 'u-mentor-1' },
      { id: 't-5', equipeId: 'eq-6', etapaId: 6, titulo: 'Gravar o Pitch Vídeo', obrigatoria: true, dataEntrega: '2026-09-01', status: 'entregue', criadoPor: 'u-mentor-2' },
      { id: 't-6', equipeId: 'eq-8', etapaId: 1, titulo: 'Revisar cadastro da ideia', descricao: 'Conferir se a descrição da ideia está clara.', obrigatoria: true, dataEntrega: '2026-08-20', status: 'atrasada', criadoPor: 'u-mentor-3' },
      { id: 't-7', equipeId: 'eq-8', etapaId: 1, titulo: 'Enviar logo e identidade da ideia', obrigatoria: false, dataEntrega: '2026-08-22', status: 'atrasada', criadoPor: 'u-mentor-3' },
      { id: 't-8', equipeId: 'eq-10', etapaId: 1, titulo: 'Confirmar dados da pousada piloto', obrigatoria: true, dataEntrega: '2026-08-27', status: 'atrasada', criadoPor: 'u-mentor-2' },
      { id: 't-9', equipeId: 'eq-12', etapaId: 2, titulo: 'Confirmar agendamento do 1º encontro', obrigatoria: true, dataEntrega: '2026-09-12', status: 'em_andamento', criadoPor: 'u-mentor-1' },
      { id: 't-10', equipeId: 'eq-14', etapaId: 3, titulo: 'Definir problema e público-alvo', descricao: 'Registrar problema, público-alvo e solução inicial.', obrigatoria: true, dataEntrega: '2026-09-15', status: 'pendente', criadoPor: 'u-mentor-1' },
      { id: 't-11', equipeId: 'eq-11', etapaId: 1, titulo: 'Refinar a descrição da proposta', obrigatoria: true, dataEntrega: '2026-09-01', status: 'ajustar', criadoPor: 'u-admin' },
      { id: 't-12', equipeId: 'eq-17', etapaId: 6, titulo: 'Gravar o Pitch Vídeo', obrigatoria: true, dataEntrega: '2026-03-10', status: 'aprovada', criadoPor: 'u-mentor-1', concluidaEm: '2026-03-11T13:00:00.000Z' },
    ],
    entregas: [
      { id: 'en-1', tarefaId: 't-3', versao: 1, enviadoPor: 'u-aluno-5', comentario: 'Canvas final revisado com a mentora.', arquivos: [{ id: 'arq-1', tipo: 'link', urlExterna: 'https://drive.example.com/bmc-finlingo' }], criadoEm: '2026-08-15T13:00:00.000Z' },
      { id: 'en-2', tarefaId: 't-5', versao: 1, enviadoPor: 'u-aluno-6', arquivos: [{ id: 'arq-2', tipo: 'arquivo', nomeOriginal: 'pitch-medtrack.mp4' }], criadoEm: '2026-08-26T13:00:00.000Z' },
      { id: 'en-3', tarefaId: 't-12', versao: 1, enviadoPor: 'u-aluno-17', arquivos: [{ id: 'arq-3', tipo: 'arquivo', nomeOriginal: 'pitch-advexpress.mp4' }], criadoEm: '2026-03-09T13:00:00.000Z' },
      { id: 'en-4', tarefaId: 't-11', versao: 1, enviadoPor: 'u-aluno-11', comentario: 'Primeira versão da proposta para revisão.', arquivos: [{ id: 'arq-4', tipo: 'link', urlExterna: 'https://drive.example.com/proposta-contacerta' }], criadoEm: '2026-08-30T13:00:00.000Z' },
    ],
    avaliacoes: [
      { id: 'av-1', entregaId: 'en-1', avaliadorId: 'u-mentor-1', resultado: 'aprovada', comentario: 'Excelente modelo de negócio, aprovado.', criadoEm: '2026-08-16T13:00:00.000Z' },
      { id: 'av-2', entregaId: 'en-3', avaliadorId: 'u-mentor-1', resultado: 'aprovada', comentario: 'Pitch claro e bem estruturado.', criadoEm: '2026-03-10T13:00:00.000Z' },
      { id: 'av-3', entregaId: 'en-4', avaliadorId: 'u-admin', resultado: 'ajustar', comentario: 'Detalhar melhor o problema e o público-alvo.', criadoEm: '2026-08-31T13:00:00.000Z' },
    ],
  };
}
