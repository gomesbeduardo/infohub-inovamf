import type { AppState } from '@/domain/types';

/**
 * Estado inicial (seed) do app mockado. Retorna sempre um objeto novo — nenhuma
 * referência é compartilhada entre chamadas, para que os testes e o store
 * possam partir de um estado limpo. IDs são strings/números fixos (sem random),
 * de modo que o seed seja determinístico.
 *
 * Referência de "hoje" nas datas: ciclo 2026/2 (agosto/2026).
 */
export function seed(): AppState {
  return {
    usuarios: [
      { id: 'u-admin', nome: 'Admin InfoHub', email: 'admin@infohub.dev', senha: '123456', telefone: '(55) 99999-0001', tipo: 'admin', ativo: true },
      { id: 'u-mentor-1', nome: 'Marina Mentora', email: 'mentor@infohub.dev', senha: '123456', telefone: '(55) 99999-0002', tipo: 'mentor', ativo: true },
      { id: 'u-mentor-2', nome: 'Otávio Mentor', email: 'otavio@infohub.dev', senha: '123456', telefone: '(55) 99999-0003', tipo: 'mentor', ativo: true },
      { id: 'u-aluno-1', nome: 'Ana Souza', email: 'ana@infohub.dev', senha: '123456', telefone: '(55) 98888-0001', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-2', nome: 'Bruno Lima', email: 'bruno@infohub.dev', senha: '123456', telefone: '(55) 98888-0002', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-3', nome: 'Carla Nunes', email: 'aluno@infohub.dev', senha: '123456', telefone: '(55) 98888-0003', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-4', nome: 'Diego Alves', email: 'diego@infohub.dev', senha: '123456', telefone: '(55) 98888-0004', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-5', nome: 'Elisa Prado', email: 'elisa@infohub.dev', senha: '123456', telefone: '(55) 98888-0005', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-6', nome: 'Felipe Rocha', email: 'felipe@infohub.dev', senha: '123456', telefone: '(55) 98888-0006', tipo: 'aluno', ativo: true },
      { id: 'u-aluno-7', nome: 'Gabriela Dias', email: 'gabriela@infohub.dev', senha: '123456', telefone: '(55) 98888-0007', tipo: 'aluno', ativo: true },
    ],
    alunos: [
      { usuarioId: 'u-aluno-1', curso: 'Pedagogia', semestre: '4' },
      { usuarioId: 'u-aluno-2', curso: 'Enfermagem', semestre: '6' },
      { usuarioId: 'u-aluno-3', curso: 'Ciência da Computação', semestre: '5' },
      { usuarioId: 'u-aluno-4', curso: 'Engenharia de Produção', semestre: '7' },
      { usuarioId: 'u-aluno-5', curso: 'Administração', semestre: '3' },
      { usuarioId: 'u-aluno-6', curso: 'Medicina', semestre: '8' },
      { usuarioId: 'u-aluno-7', curso: 'Engenharia Elétrica', semestre: '9' },
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
    ciclos: [{ id: 1, nome: '2026/2' }],
    equipes: [
      {
        id: 'eq-1', nomeIdeia: 'EcoAula', slug: 'ecoaula', descricaoIdeia: 'Plataforma que leva educação ambiental gamificada para escolas públicas.',
        areaId: 1, estagioIdeia: 'ideia', origemDivulgacao: 'Instagram', mentorId: 'u-mentor-1', cicloId: 1, etapaAtualId: 1, status: 'ativa',
        criadoEm: '2026-08-05T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-1', nome: 'Ana Souza', curso: 'Pedagogia', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq1-2', nome: 'Rafael Teixeira', curso: 'Pedagogia', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-2', nomeIdeia: 'SaúdeJá', slug: 'saudeja', descricaoIdeia: 'App de triagem rápida para postos de saúde do interior.',
        areaId: 2, estagioIdeia: 'ideia', origemDivulgacao: 'Indicação de professor', mentorId: 'u-mentor-1', cicloId: 1, etapaAtualId: 2, status: 'ativa',
        criadoEm: '2026-08-06T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-2', nome: 'Bruno Lima', curso: 'Enfermagem', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq2-2', nome: 'Paula Martins', curso: 'Enfermagem', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-3', nomeIdeia: 'AgroSmart', slug: 'agrosmart', descricaoIdeia: 'Sensores de baixo custo para irrigação inteligente na agricultura familiar.',
        areaId: 3, estagioIdeia: 'prototipo', origemDivulgacao: 'Feira de inovação', mentorId: 'u-mentor-2', cicloId: 1, etapaAtualId: 3, status: 'ativa',
        criadoEm: '2026-08-07T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-3', nome: 'Carla Nunes', curso: 'Ciência da Computação', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq3-2', nome: 'Thiago Barros', curso: 'Agronomia', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-4', nomeIdeia: 'ReciclaAI', slug: 'reciclaai', descricaoIdeia: 'Marketplace que conecta catadores a cooperativas de reciclagem.',
        areaId: 4, estagioIdeia: 'prototipo', origemDivulgacao: 'Evento InfoHub', mentorId: 'u-mentor-2', cicloId: 1, etapaAtualId: 4, status: 'ativa',
        criadoEm: '2026-08-08T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-4', nome: 'Diego Alves', curso: 'Engenharia de Produção', papel: 'lider', ativo: true },
        ],
      },
      {
        id: 'eq-5', nomeIdeia: 'FinLingo', slug: 'finlingo', descricaoIdeia: 'Educação financeira para jovens via microlições diárias.',
        areaId: 3, estagioIdeia: 'mvp_desenvolvimento', origemDivulgacao: 'Instagram', mentorId: 'u-mentor-1', cicloId: 1, etapaAtualId: 5, status: 'ativa',
        criadoEm: '2026-08-04T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-5', nome: 'Elisa Prado', curso: 'Administração', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq5-2', nome: 'Igor Souza', curso: 'Sistemas de Informação', papel: 'integrante', ativo: true },
        ],
      },
      {
        id: 'eq-6', nomeIdeia: 'MedTrack', slug: 'medtrack', descricaoIdeia: 'Acompanhamento de adesão a tratamentos crônicos por lembretes inteligentes.',
        areaId: 2, estagioIdeia: 'mvp_desenvolvimento', origemDivulgacao: 'Indicação de aluno', mentorId: 'u-mentor-2', cicloId: 1, etapaAtualId: 6, status: 'ativa',
        criadoEm: '2026-08-02T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-6', nome: 'Felipe Rocha', curso: 'Medicina', papel: 'lider', ativo: true },
        ],
      },
      {
        id: 'eq-7', nomeIdeia: 'SolarGrid', slug: 'solargrid', descricaoIdeia: 'Gestão comunitária de energia solar compartilhada.',
        areaId: 4, estagioIdeia: 'mvp_pronto', origemDivulgacao: 'Feira de inovação', mentorId: 'u-mentor-1', cicloId: 1, etapaAtualId: 6, status: 'pronta_inovamf',
        prontaInovamfEm: '2026-08-22T13:00:00.000Z', criadoEm: '2026-07-28T13:00:00.000Z',
        membros: [
          { usuarioId: 'u-aluno-7', nome: 'Gabriela Dias', curso: 'Engenharia Elétrica', papel: 'lider', ativo: true },
          { usuarioId: 'm-eq7-2', nome: 'Lucas Fontes', curso: 'Engenharia Elétrica', papel: 'integrante', ativo: true },
        ],
      },
    ],
    historico: [
      { id: 'h-1', equipeId: 'eq-7', etapaOrigemId: 4, etapaDestinoId: 5, movidoPor: 'u-mentor-1', forcado: false, criadoEm: '2026-08-12T13:00:00.000Z' },
      { id: 'h-2', equipeId: 'eq-7', etapaOrigemId: 5, etapaDestinoId: 6, movidoPor: 'u-mentor-1', forcado: false, criadoEm: '2026-08-18T13:00:00.000Z' },
    ],
    anotacoes: [
      { id: 'an-1', equipeId: 'eq-3', etapaId: 3, autorId: 'u-mentor-2', conteudo: 'Time engajado; falta fechar a definição de público-alvo.', criadoEm: '2026-08-19T13:00:00.000Z' },
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
    tarefas: [
      { id: 't-1', equipeId: 'eq-3', etapaId: 3, titulo: 'Definir problema e público-alvo', descricao: 'Registrar problema, público-alvo e solução inicial.', obrigatoria: true, dataEntrega: '2026-08-20', status: 'atrasada', criadoPor: 'u-mentor-2' },
      { id: 't-2', equipeId: 'eq-3', etapaId: 3, titulo: 'Levantar concorrentes diretos', obrigatoria: false, dataEntrega: '2026-09-05', status: 'pendente', criadoPor: 'u-mentor-2' },
      { id: 't-3', equipeId: 'eq-5', etapaId: 5, titulo: 'Enviar o Business Model Canvas', descricao: 'Modelo de negócio completo no template do InfoHub.', obrigatoria: true, dataEntrega: '2026-08-15', status: 'aprovada', criadoPor: 'u-mentor-1', concluidaEm: '2026-08-16T13:00:00.000Z' },
      { id: 't-4', equipeId: 'eq-5', etapaId: 5, titulo: 'Revisar a precificação', obrigatoria: false, dataEntrega: '2026-09-10', status: 'em_andamento', criadoPor: 'u-mentor-1' },
      { id: 't-5', equipeId: 'eq-6', etapaId: 6, titulo: 'Gravar o Pitch Vídeo', obrigatoria: true, dataEntrega: '2026-09-01', status: 'entregue', criadoPor: 'u-mentor-2' },
    ],
    entregas: [
      { id: 'en-1', tarefaId: 't-3', versao: 1, enviadoPor: 'u-aluno-5', comentario: 'Canvas final revisado com a mentora.', arquivos: [{ id: 'arq-1', tipo: 'link', urlExterna: 'https://drive.example.com/bmc-finlingo' }], criadoEm: '2026-08-15T13:00:00.000Z' },
      { id: 'en-2', tarefaId: 't-5', versao: 1, enviadoPor: 'u-aluno-6', arquivos: [{ id: 'arq-2', tipo: 'arquivo', nomeOriginal: 'pitch-medtrack.mp4' }], criadoEm: '2026-08-26T13:00:00.000Z' },
    ],
    avaliacoes: [
      { id: 'av-1', entregaId: 'en-1', avaliadorId: 'u-mentor-1', resultado: 'aprovada', comentario: 'Excelente modelo de negócio, aprovado.', criadoEm: '2026-08-16T13:00:00.000Z' },
    ],
  };
}
