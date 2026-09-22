'use client';

import { useState } from 'react';
import { useAreas, useInscricao } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import { ESTAGIO_LABEL } from '@/domain/labels';
import { CURSO_OPTIONS } from '@/domain/cursos';
import { SEMESTRE_LABEL, SEMESTRE_OPTIONS } from '@/domain/semestres';
import type { EstagioIdeia } from '@/domain/types';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Textarea } from '@/design-system/components/Textarea';
import { Select } from '@/design-system/components/Select';
import { FormField } from '@/design-system/components/FormField';
import { AlertIcon } from '@/design-system/icons';
import { LinksConvite } from './LinksConvite';

type Colega = { nome: string; email: string };

const ESTAGIOS: EstagioIdeia[] = [
  'ideia',
  'prototipo',
  'mvp_desenvolvimento',
  'mvp_pronto',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function vazio(v?: string): boolean {
  return !v || v.trim() === '';
}

export function CadastroForm() {
  const { data: areas } = useAreas();
  const inscricao = useInscricao();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [curso, setCurso] = useState('');
  const [semestre, setSemestre] = useState('');
  const [matricula, setMatricula] = useState('');
  const [nomeIdeia, setNomeIdeia] = useState('');
  const [descricaoIdeia, setDescricaoIdeia] = useState('');
  const [area, setArea] = useState('');
  const [estagioIdeia, setEstagioIdeia] = useState<EstagioIdeia>('ideia');
  const [origemDivulgacao, setOrigemDivulgacao] = useState('');
  const [colegas, setColegas] = useState<Colega[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});

  const apiError = inscricao.error instanceof ApiError ? inscricao.error : null;
  const colegaErroIndex =
    apiError && (apiError.code === 'RN03_EQUIPE_ATIVA' || apiError.code === 'EMAIL_NAO_ALUNO')
      ? colegas.findIndex((c) => c.email.trim() && apiError.message.includes(c.email.trim()))
      : -1;
  const erroGeral = apiError && colegaErroIndex < 0 ? apiError.message : null;

  function validar(): Record<string, string> {
    const e: Record<string, string> = {};
    if (vazio(nome)) e.nome = 'Informe seu nome.';

    if (vazio(email)) e.email = 'Informe seu e-mail.';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'E-mail inválido.';

    if (vazio(senha)) e.senha = 'Crie uma senha.';
    else if (senha.length < 8) e.senha = 'A senha deve ter ao menos 8 caracteres.';

    if (vazio(confirmarSenha) || confirmarSenha !== senha) e.confirmarSenha = 'As senhas não coincidem.';

    if (vazio(telefone)) e.telefone = 'Informe um telefone.';
    if (vazio(curso)) e.curso = 'Informe seu curso.';
    if (vazio(semestre)) e.semestre = 'Selecione o semestre/módulo.';
    if (vazio(nomeIdeia)) e.nomeIdeia = 'Dê um nome à ideia.';
    if (vazio(descricaoIdeia)) e.descricaoIdeia = 'Descreva a ideia.';
    if (vazio(area)) e.area = 'Escolha uma área.';
    if (!estagioIdeia) e.estagioIdeia = 'Selecione o estágio da ideia.';

    colegas.forEach((c, i) => {
      if (vazio(c.nome)) e[`colega-${i}-nome`] = 'Informe o nome.';
      if (vazio(c.email)) e[`colega-${i}-email`] = 'Informe o e-mail.';
      else if (!EMAIL_RE.test(c.email.trim())) e[`colega-${i}-email`] = 'E-mail inválido.';
    });

    return e;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validacao = validar();
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    inscricao.mutate({
      lider: {
        nome,
        email,
        senha,
        telefone,
        curso,
        semestre,
        matricula: matricula.trim() || undefined,
      },
      ideia: {
        nome: nomeIdeia,
        descricao: descricaoIdeia,
        estagio: estagioIdeia,
        area,
        origem: origemDivulgacao.trim() || undefined,
      },
      colegas: colegas.map((c) => ({ nome: c.nome, email: c.email })),
    });
  }

  if (inscricao.isSuccess) {
    return (
      <LinksConvite
        nomeIdeia={inscricao.data.equipe.nomeIdeia}
        colegas={inscricao.data.colegas}
      />
    );
  }

  const areaOptions = (areas ?? []).map((a) => ({ value: a.nome, label: a.nome }));

  return (
    <Card className="w-full overflow-hidden shadow-md">
      <Card.Header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text">Cadastre sua ideia</h1>
        <p className="text-sm text-text-muted">
          Preencha os dados abaixo para criar sua conta e registrar a equipe.
        </p>
      </Card.Header>

      <Card.Body>
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-text">
              Seus dados
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nome" htmlFor="nome" error={erros.nome}>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </FormField>
              <FormField label="E-mail" htmlFor="email" error={erros.email}>
                <Input id="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
              <FormField label="Senha" htmlFor="senha" error={erros.senha}>
                <Input id="senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
              </FormField>
              <FormField label="Confirmar senha" htmlFor="confirmarSenha" error={erros.confirmarSenha}>
                <Input
                  id="confirmarSenha"
                  type="password"
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </FormField>
              <FormField label="Telefone" htmlFor="telefone" error={erros.telefone}>
                <Input id="telefone" type="tel" autoComplete="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </FormField>
              <FormField label="Curso" htmlFor="curso" error={erros.curso}>
                <Select
                  id="curso"
                  options={CURSO_OPTIONS}
                  placeholder="Selecione…"
                  value={curso}
                  onChange={(e) => setCurso(e.target.value)}
                />
              </FormField>
              <FormField label={SEMESTRE_LABEL} htmlFor="semestre" error={erros.semestre}>
                <Select
                  id="semestre"
                  options={SEMESTRE_OPTIONS}
                  placeholder="Selecione…"
                  value={semestre}
                  onChange={(e) => setSemestre(e.target.value)}
                />
              </FormField>
              <FormField label="Matrícula" htmlFor="matricula" hint="Opcional">
                <Input id="matricula" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
              </FormField>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text">
                Sua equipe
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setColegas((xs) => [...xs, { nome: '', email: '' }])
                }
              >
                Adicionar integrante
              </Button>
            </div>
            {colegas.length === 0 && (
              <p className="text-sm text-text-muted">
                Você é o líder. Adicione os demais integrantes, se houver.
              </p>
            )}
            {colegas.map((c, i) => {
              const erroApiColega = colegaErroIndex === i ? apiError!.message : undefined;
              const erroCampo =
                erros[`colega-${i}-nome`] ?? erros[`colega-${i}-email`] ?? erroApiColega;
              return (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Input
                      aria-label={`Nome do integrante ${i + 1}`}
                      aria-invalid={erros[`colega-${i}-nome`] ? true : undefined}
                      placeholder="Nome"
                      value={c.nome}
                      onChange={(e) =>
                        setColegas((xs) =>
                          xs.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)),
                        )
                      }
                    />
                    <Input
                      aria-label={`E-mail do integrante ${i + 1}`}
                      aria-invalid={erros[`colega-${i}-email`] || erroApiColega ? true : undefined}
                      type="email"
                      placeholder="E-mail"
                      value={c.email}
                      onChange={(e) =>
                        setColegas((xs) =>
                          xs.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setColegas((xs) => xs.filter((_, j) => j !== i))
                      }
                    >
                      Remover
                    </Button>
                  </div>
                  {erroCampo && (
                    <p
                      role="alert"
                      className="flex items-center gap-1.5 text-xs font-medium text-danger-text"
                    >
                      <AlertIcon size={14} className="shrink-0" />
                      {erroCampo}
                    </p>
                  )}
                </div>
              );
            })}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-text">
              Sua ideia
            </h2>
            <FormField label="Nome da ideia" htmlFor="nomeIdeia" error={erros.nomeIdeia}>
              <Input id="nomeIdeia" value={nomeIdeia} onChange={(e) => setNomeIdeia(e.target.value)} />
            </FormField>
            <FormField
              label="Descrição da ideia"
              htmlFor="descricaoIdeia"
              error={erros.descricaoIdeia}
              hint="Um esboço, mesmo que ainda cru."
            >
              <Textarea
                id="descricaoIdeia"
                value={descricaoIdeia}
                onChange={(e) => setDescricaoIdeia(e.target.value)}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Área" htmlFor="area" error={erros.area}>
                <Select
                  id="area"
                  options={areaOptions}
                  placeholder="Selecione…"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </FormField>
              <FormField label="Origem da divulgação" htmlFor="origem" hint="Opcional">
                <Input
                  id="origem"
                  value={origemDivulgacao}
                  onChange={(e) => setOrigemDivulgacao(e.target.value)}
                />
              </FormField>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-text">
                Estágio da ideia
              </legend>
              <div className="flex flex-wrap gap-3">
                {ESTAGIOS.map((es) => (
                  <label key={es} className="flex items-center gap-2 text-sm text-text">
                    <input
                      type="radio"
                      name="estagio"
                      value={es}
                      checked={estagioIdeia === es}
                      onChange={() => setEstagioIdeia(es)}
                    />
                    {ESTAGIO_LABEL[es]}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          {erroGeral && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
            >
              <AlertIcon size={16} className="shrink-0" />
              {erroGeral}
              {apiError?.code === 'EMAIL_TAKEN' && (
                <a href="/login" className="font-medium underline">
                  Entrar
                </a>
              )}
            </p>
          )}

          <div className="flex items-center justify-between">
            <a href="/login" className="text-sm text-text-muted hover:text-text">
              Já tenho conta
            </a>
            <Button type="submit" size="lg" disabled={inscricao.isPending}>
              {inscricao.isPending ? 'Cadastrando…' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Card.Body>
    </Card>
  );
}
