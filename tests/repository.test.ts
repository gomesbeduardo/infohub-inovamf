import { describe, it, expect } from 'vitest';
import { seed } from '@/data/fixtures';
import {
  autenticar,
  validarCadastro,
  criarEquipeDoFormulario,
  filtrarEquipes,
  tarefasObrigatoriasPendentes,
  avancarEtapa,
  retrocederEtapa,
  calcularStatusAtraso,
  criarTarefa,
  enviarEntrega,
  avaliarEntrega,
  calcularIndicadores,
  adicionarAnotacao,
  equipesVisiveis,
  equipesParaCSV,
  criarUsuario,
  editarUsuario,
  definirAtivoUsuario,
  redefinirSenha,
  type DadosCadastro,
} from '@/data/repository';

const dadosValidos: DadosCadastro = {
  nome: 'João Teste',
  email: 'joao@teste.dev',
  senha: '123456',
  telefone: '(55) 90000-0000',
  curso: 'Sistemas de Informação',
  semestre: '2',
  integrantes: [{ nome: 'Maria Colega', curso: 'Direito' }],
  nomeIdeia: 'Minha Ideia',
  descricaoIdeia: 'Uma ideia bem legal para testar.',
  areaId: 1,
  estagioIdeia: 'ideia',
};

describe('autenticar', () => {
  it('retorna o usuário com credenciais corretas', () => {
    const u = autenticar(seed(), 'admin@infohub.dev', '123456');
    expect(u).not.toBeNull();
    expect(u!.tipo).toBe('admin');
  });

  it('retorna null com senha errada', () => {
    expect(autenticar(seed(), 'admin@infohub.dev', 'errada')).toBeNull();
  });

  it('retorna null com e-mail inexistente', () => {
    expect(autenticar(seed(), 'ninguem@infohub.dev', '123456')).toBeNull();
  });

  it('ignora caixa e espaços no e-mail', () => {
    const u = autenticar(seed(), '  ADMIN@InfoHub.dev  ', '123456');
    expect(u?.tipo).toBe('admin');
  });
});

describe('validarCadastro', () => {
  it('acusa todos os campos obrigatórios quando vazio', () => {
    const e = validarCadastro({});
    for (const campo of [
      'nome',
      'email',
      'senha',
      'telefone',
      'curso',
      'nomeIdeia',
      'descricaoIdeia',
      'areaId',
      'estagioIdeia',
    ]) {
      expect(e[campo], `esperava erro em ${campo}`).toBeTruthy();
    }
  });

  it('não acusa erros com dados válidos', () => {
    expect(validarCadastro(dadosValidos)).toEqual({});
  });

  it('acusa e-mail já cadastrado quando o estado é fornecido', () => {
    const e = validarCadastro({ ...dadosValidos, email: 'admin@infohub.dev' }, seed());
    expect(e.email).toBeTruthy();
  });
});

describe('criarEquipeDoFormulario', () => {
  it('cria equipe na etapa 1, ativa, com líder e novo usuário aluno', () => {
    const s = seed();
    const { estado, equipe, usuario } = criarEquipeDoFormulario(s, dadosValidos);

    expect(equipe.etapaAtualId).toBe(1);
    expect(equipe.status).toBe('ativa');

    const lider = equipe.membros.find((m) => m.papel === 'lider');
    expect(lider?.usuarioId).toBe(usuario.id);

    expect(usuario.tipo).toBe('aluno');
    expect(estado.usuarios.some((u) => u.id === usuario.id)).toBe(true);
    expect(estado.equipes.some((eq) => eq.id === equipe.id)).toBe(true);
    // integrante entrou na equipe
    expect(equipe.membros.some((m) => m.papel === 'integrante')).toBe(true);
  });

  it('não muta o estado original (imutabilidade)', () => {
    const s = seed();
    const nUsuarios = s.usuarios.length;
    const nEquipes = s.equipes.length;
    criarEquipeDoFormulario(s, dadosValidos);
    expect(s.usuarios.length).toBe(nUsuarios);
    expect(s.equipes.length).toBe(nEquipes);
  });
});

describe('filtrarEquipes', () => {
  it('filtra por busca (case-insensitive e sem acento)', () => {
    const s = seed();
    expect(filtrarEquipes(s, { busca: 'AGRO' }).map((e) => e.id)).toEqual(['eq-3']);
    // 'saude' (sem acento) casa 'SaúdeJá'
    expect(filtrarEquipes(s, { busca: 'saude' }).map((e) => e.id)).toEqual(['eq-2']);
  });

  it('filtra por área', () => {
    const ids = filtrarEquipes(seed(), { areaId: 2 }).map((e) => e.id).sort();
    expect(ids).toEqual(['eq-16', 'eq-2', 'eq-6']);
  });

  it('filtra por mentor', () => {
    const ids = filtrarEquipes(seed(), { mentorId: 'u-mentor-2' }).map((e) => e.id).sort();
    expect(ids).toEqual(['eq-10', 'eq-15', 'eq-19', 'eq-3', 'eq-4', 'eq-6']);
  });

  it('filtra por curso', () => {
    const ids = filtrarEquipes(seed(), { curso: 'Direito' }).map((e) => e.id).sort();
    expect(ids).toEqual(['eq-17', 'eq-8']);
  });

  it('filtra por status de tarefa (atrasada)', () => {
    // ordenado para não depender da ordem do array de equipes no seed
    const ids = filtrarEquipes(seed(), { statusTarefa: 'atrasada' }).map((e) => e.id).sort();
    expect(ids).toEqual(['eq-10', 'eq-3', 'eq-8']);
  });
});

describe('tarefasObrigatoriasPendentes', () => {
  it('lista só as obrigatórias não aprovadas da etapa', () => {
    const pend = tarefasObrigatoriasPendentes(seed(), 'eq-3', 3);
    expect(pend.map((t) => t.id)).toEqual(['t-1']);
  });
});

describe('avancarEtapa', () => {
  it('não avança com obrigatória pendente e sem forçar (RN-01)', () => {
    const s = seed();
    const r = avancarEtapa(s, 'eq-3', { forcar: false, autorId: 'u-mentor-2' });
    expect(r.equipes.find((e) => e.id === 'eq-3')!.etapaAtualId).toBe(3);
    expect(r.historico.length).toBe(s.historico.length);
  });

  it('avança forçado, grava histórico forcado', () => {
    const s = seed();
    const r = avancarEtapa(s, 'eq-3', { forcar: true, autorId: 'u-mentor-2', observacao: 'ok' });
    expect(r.equipes.find((e) => e.id === 'eq-3')!.etapaAtualId).toBe(4);
    const h = r.historico[r.historico.length - 1];
    expect(h.equipeId).toBe('eq-3');
    expect(h.forcado).toBe(true);
    expect(h.observacao).toBe('ok');
  });

  it('avança normalmente quando não há obrigatória pendente', () => {
    const r = avancarEtapa(seed(), 'eq-1', { forcar: false, autorId: 'u-mentor-1' });
    expect(r.equipes.find((e) => e.id === 'eq-1')!.etapaAtualId).toBe(2);
  });

  it('ao concluir a etapa 6 marca pronta_inovamf', () => {
    const r = avancarEtapa(seed(), 'eq-6', { forcar: true, autorId: 'u-mentor-2' });
    const eq = r.equipes.find((e) => e.id === 'eq-6')!;
    expect(eq.status).toBe('pronta_inovamf');
    expect(eq.prontaInovamfEm).toBeTruthy();
  });

  it('não muta o estado original', () => {
    const s = seed();
    const etapaAntes = s.equipes.find((e) => e.id === 'eq-1')!.etapaAtualId;
    avancarEtapa(s, 'eq-1', { forcar: false, autorId: 'u-mentor-1' });
    expect(s.equipes.find((e) => e.id === 'eq-1')!.etapaAtualId).toBe(etapaAntes);
  });
});

describe('retrocederEtapa', () => {
  it('retrocede uma etapa e grava histórico', () => {
    const r = retrocederEtapa(seed(), 'eq-3', { autorId: 'u-mentor-2' });
    expect(r.equipes.find((e) => e.id === 'eq-3')!.etapaAtualId).toBe(2);
    expect(r.historico[r.historico.length - 1].etapaDestinoId).toBe(2);
  });

  it('não retrocede abaixo da etapa 1', () => {
    const s = seed();
    const r = retrocederEtapa(s, 'eq-1', { autorId: 'u-mentor-1' });
    expect(r.equipes.find((e) => e.id === 'eq-1')!.etapaAtualId).toBe(1);
    expect(r.historico.length).toBe(s.historico.length);
  });
});

describe('calcularStatusAtraso', () => {
  it('marca pendente/em_andamento vencidas como atrasada, sem tocar aprovada/entregue', () => {
    const r = calcularStatusAtraso(seed(), '2026-09-30');
    const byId = (id: string) => r.tarefas.find((t) => t.id === id)!;
    expect(byId('t-2').status).toBe('atrasada'); // era pendente, venceu
    expect(byId('t-4').status).toBe('atrasada'); // era em_andamento, venceu
    expect(byId('t-3').status).toBe('aprovada'); // não muda
    expect(byId('t-5').status).toBe('entregue'); // não muda
  });
});

describe('criarTarefa', () => {
  it('cria tarefa manual com status pendente', () => {
    const s = seed();
    const r = criarTarefa(s, 'eq-1', {
      titulo: 'Enviar logo',
      etapaId: 1,
      dataEntrega: '2026-09-20',
      obrigatoria: true,
      criadoPor: 'u-mentor-1',
    });
    expect(r.tarefas.length).toBe(s.tarefas.length + 1);
    const nova = r.tarefas[r.tarefas.length - 1];
    expect(nova.status).toBe('pendente');
    expect(nova.equipeId).toBe('eq-1');
    expect(nova.titulo).toBe('Enviar logo');
  });

  it('cria tarefa a partir de um modelo, copiando título/etapa/obrigatória', () => {
    const r = criarTarefa(seed(), 'eq-1', {
      modeloId: 5,
      dataEntrega: '2026-09-20',
      criadoPor: 'u-mentor-1',
    });
    const nova = r.tarefas[r.tarefas.length - 1];
    expect(nova.titulo).toBe('Enviar o Business Model Canvas');
    expect(nova.etapaId).toBe(5);
    expect(nova.obrigatoria).toBe(true);
    expect(nova.status).toBe('pendente');
  });
});

describe('enviarEntrega', () => {
  it('cria entrega versão 1 e passa a tarefa para entregue', () => {
    const s = seed();
    const r = enviarEntrega(s, 't-2', {
      enviadoPor: 'u-aluno-3',
      arquivos: [{ id: 'a1', tipo: 'link', urlExterna: 'https://ex.com/doc' }],
    });
    const entrega = r.entregas.find((e) => e.tarefaId === 't-2');
    expect(entrega?.versao).toBe(1);
    expect(r.tarefas.find((t) => t.id === 't-2')!.status).toBe('entregue');
  });

  it('reenvio incrementa a versão', () => {
    let r = enviarEntrega(seed(), 't-2', {
      enviadoPor: 'u-aluno-3',
      arquivos: [{ id: 'a1', tipo: 'link', urlExterna: 'https://ex.com/v1' }],
    });
    r = enviarEntrega(r, 't-2', {
      enviadoPor: 'u-aluno-3',
      arquivos: [{ id: 'a2', tipo: 'link', urlExterna: 'https://ex.com/v2' }],
    });
    const versoes = r.entregas
      .filter((e) => e.tarefaId === 't-2')
      .map((e) => e.versao)
      .sort();
    expect(versoes).toEqual([1, 2]);
  });
});

describe('avaliarEntrega', () => {
  it('aprovar deixa a tarefa aprovada com concluidaEm e registra avaliação', () => {
    const s = seed();
    const r = avaliarEntrega(s, 'en-2', {
      resultado: 'aprovada',
      avaliadorId: 'u-mentor-2',
    });
    const tarefa = r.tarefas.find((t) => t.id === 't-5')!;
    expect(tarefa.status).toBe('aprovada');
    expect(tarefa.concluidaEm).toBeTruthy();
    expect(r.avaliacoes.length).toBe(s.avaliacoes.length + 1);
  });

  it('solicitar ajustes deixa a tarefa como ajustar', () => {
    const r = avaliarEntrega(seed(), 'en-2', {
      resultado: 'ajustar',
      comentario: 'Refazer o slide 3',
      avaliadorId: 'u-mentor-2',
    });
    expect(r.tarefas.find((t) => t.id === 't-5')!.status).toBe('ajustar');
  });
});

describe('calcularIndicadores', () => {
  it('conta equipes ativas, prontas, atrasadas e distribuição por etapa', () => {
    const ind = calcularIndicadores(seed());
    expect(ind.equipesAtivas).toBe(15);
    expect(ind.prontasInovamf).toBe(3); // pronta_inovamf (2) + encaminhada_inovamf (1)
    expect(ind.tarefasAtrasadas).toBeGreaterThanOrEqual(1);
    expect(ind.porEtapa).toHaveLength(6);
    // distribuição desigual (funil que afunila): etapas 1..6
    expect(ind.porEtapa.map((p) => p.total)).toEqual([5, 3, 3, 1, 2, 1]);
  });
});

describe('adicionarAnotacao', () => {
  it('adiciona uma anotação interna à equipe', () => {
    const s = seed();
    const r = adicionarAnotacao(s, {
      equipeId: 'eq-3',
      autorId: 'u-mentor-2',
      conteudo: 'Reunião produtiva.',
    });
    expect(r.anotacoes.length).toBe(s.anotacoes.length + 1);
    expect(r.anotacoes[r.anotacoes.length - 1].conteudo).toBe('Reunião produtiva.');
  });
});

describe('equipesVisiveis', () => {
  it('admin vê todas as equipes', () => {
    const s = seed();
    const admin = s.usuarios.find((u) => u.tipo === 'admin')!;
    expect(equipesVisiveis(s, admin)).toHaveLength(s.equipes.length);
  });

  it('mentor vê apenas as equipes que mentora', () => {
    const s = seed();
    const mentor = s.usuarios.find((u) => u.id === 'u-mentor-2')!;
    const ids = equipesVisiveis(s, mentor).map((e) => e.id).sort();
    expect(ids).toEqual(['eq-10', 'eq-15', 'eq-19', 'eq-3', 'eq-4', 'eq-6']);
  });

  it('aluno vê apenas a própria equipe', () => {
    const s = seed();
    const aluno = s.usuarios.find((u) => u.id === 'u-aluno-3')!;
    const ids = equipesVisiveis(s, aluno).map((e) => e.id);
    expect(ids).toEqual(['eq-3']);
  });
});

describe('filtrarEquipes por ciclo', () => {
  it('filtra pelo ciclo e retorna vazio para ciclo inexistente', () => {
    const s = seed();
    const noCiclo = (id: number) =>
      s.equipes.filter((e) => e.cicloId === id).length;
    expect(filtrarEquipes(s, { cicloId: 1 })).toHaveLength(noCiclo(1));
    expect(filtrarEquipes(s, { cicloId: 2 })).toHaveLength(noCiclo(2));
    expect(noCiclo(2)).toBeGreaterThan(0); // há equipes na turma anterior
    expect(filtrarEquipes(s, { cicloId: 999 })).toHaveLength(0);
  });
});

describe('equipesParaCSV', () => {
  it('gera CSV com cabeçalho e uma linha por equipe', () => {
    const s = seed();
    const csv = equipesParaCSV(s, s.equipes);
    const linhas = csv.split('\n');
    expect(linhas[0]).toContain('Ideia');
    expect(linhas).toHaveLength(s.equipes.length + 1);
    expect(csv).toContain('AgroSmart');
    expect(csv).toContain('Tecnologia');
  });
});

describe('gestão de contas (RF-03)', () => {
  it('criarUsuario adiciona um mentor ativo', () => {
    const s = seed();
    const r = criarUsuario(s, {
      nome: 'Nova Mentora',
      email: 'nova.mentora@infohub.dev',
      senha: '123456',
      telefone: '(55) 90000-2222',
      tipo: 'mentor',
    });
    expect(r.usuarios.length).toBe(s.usuarios.length + 1);
    const u = r.usuarios[r.usuarios.length - 1];
    expect(u.tipo).toBe('mentor');
    expect(u.ativo).toBe(true);
  });

  it('editarUsuario altera o nome', () => {
    const r = editarUsuario(seed(), 'u-mentor-1', { nome: 'Marina Alterada' });
    expect(r.usuarios.find((u) => u.id === 'u-mentor-1')!.nome).toBe('Marina Alterada');
  });

  it('desativar um usuário impede o login', () => {
    const r = definirAtivoUsuario(seed(), 'u-mentor-1', false);
    expect(r.usuarios.find((u) => u.id === 'u-mentor-1')!.ativo).toBe(false);
    expect(autenticar(r, 'mentor@infohub.dev', '123456')).toBeNull();
  });
});

describe('recuperação de senha (RF-01)', () => {
  it('redefine a senha de um e-mail existente', () => {
    const { estado, ok } = redefinirSenha(seed(), 'admin@infohub.dev', 'nova-senha');
    expect(ok).toBe(true);
    expect(autenticar(estado, 'admin@infohub.dev', 'nova-senha')?.tipo).toBe('admin');
  });

  it('falha para e-mail inexistente', () => {
    const { ok } = redefinirSenha(seed(), 'ninguem@infohub.dev', 'x123456');
    expect(ok).toBe(false);
  });
});
