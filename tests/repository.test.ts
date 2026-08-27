import { describe, it, expect } from 'vitest';
import { seed } from '@/data/fixtures';
import {
  autenticar,
  validarCadastro,
  criarEquipeDoFormulario,
  type DadosCadastro,
} from '@/data/repository';

const dadosValidos: DadosCadastro = {
  nome: 'João Teste',
  email: 'joao@teste.dev',
  senha: '123456',
  telefone: '(55) 90000-0000',
  curso: 'Análise e Desenvolvimento de Sistemas',
  semestre: '2',
  integrantes: [{ nome: 'Maria Colega', curso: 'ADS' }],
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
