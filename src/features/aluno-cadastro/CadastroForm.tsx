'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, useActions } from '@/data/store';
import { setUsuarioAtual } from '@/data/session';
import { validarCadastro, type DadosCadastro } from '@/data/repository';
import { ESTAGIO_LABEL } from '@/domain/labels';
import type { EstagioIdeia } from '@/domain/types';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Textarea } from '@/design-system/components/Textarea';
import { Select } from '@/design-system/components/Select';
import { FormField } from '@/design-system/components/FormField';
import { Logo } from '@/design-system/Logo';

type Integrante = { nome: string; curso: string };

const ESTAGIOS: EstagioIdeia[] = [
  'ideia',
  'prototipo',
  'mvp_desenvolvimento',
  'mvp_pronto',
];

export function CadastroForm() {
  const router = useRouter();
  const { state } = useStore();
  const { cadastrar } = useActions();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [curso, setCurso] = useState('');
  const [semestre, setSemestre] = useState('');
  const [nomeIdeia, setNomeIdeia] = useState('');
  const [descricaoIdeia, setDescricaoIdeia] = useState('');
  const [areaId, setAreaId] = useState('');
  const [estagioIdeia, setEstagioIdeia] = useState<EstagioIdeia>('ideia');
  const [origemDivulgacao, setOrigemDivulgacao] = useState('');
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});

  function montarDados(): DadosCadastro {
    return {
      nome,
      email,
      senha,
      telefone,
      curso,
      semestre,
      integrantes,
      nomeIdeia,
      descricaoIdeia,
      areaId: areaId ? Number(areaId) : NaN,
      estagioIdeia,
      origemDivulgacao: origemDivulgacao || undefined,
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dados = montarDados();
    const validacao = validarCadastro(dados, state);
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    const { usuario } = cadastrar(dados);
    setUsuarioAtual(usuario);
    router.push('/aluno');
  }

  const areaOptions = state.areas.map((a) => ({
    value: String(a.id),
    label: a.nome,
  }));

  return (
    <Card className="w-full max-w-2xl">
      <Card.Header className="flex flex-col gap-1">
        <Logo withTagline />
        <h1 className="text-lg font-semibold text-text">Cadastre sua ideia</h1>
        <p className="text-sm text-text-muted">
          Preencha os dados abaixo para criar sua conta e registrar a equipe.
        </p>
      </Card.Header>

      <Card.Body>
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Seus dados
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nome" htmlFor="nome" error={erros.nome}>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </FormField>
              <FormField label="E-mail" htmlFor="email" error={erros.email}>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
              <FormField label="Senha" htmlFor="senha" error={erros.senha}>
                <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
              </FormField>
              <FormField label="Telefone" htmlFor="telefone" error={erros.telefone}>
                <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </FormField>
              <FormField label="Curso" htmlFor="curso" error={erros.curso}>
                <Input id="curso" value={curso} onChange={(e) => setCurso(e.target.value)} />
              </FormField>
              <FormField label="Semestre" htmlFor="semestre" hint="Opcional">
                <Input id="semestre" value={semestre} onChange={(e) => setSemestre(e.target.value)} />
              </FormField>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                Sua equipe
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setIntegrantes((xs) => [...xs, { nome: '', curso: '' }])
                }
              >
                Adicionar integrante
              </Button>
            </div>
            {integrantes.length === 0 && (
              <p className="text-sm text-text-muted">
                Você é o líder. Adicione os demais integrantes, se houver.
              </p>
            )}
            {integrantes.map((it, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  aria-label={`Nome do integrante ${i + 1}`}
                  placeholder="Nome"
                  value={it.nome}
                  onChange={(e) =>
                    setIntegrantes((xs) =>
                      xs.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  aria-label={`Curso do integrante ${i + 1}`}
                  placeholder="Curso"
                  value={it.curso}
                  onChange={(e) =>
                    setIntegrantes((xs) =>
                      xs.map((x, j) => (j === i ? { ...x, curso: e.target.value } : x)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setIntegrantes((xs) => xs.filter((_, j) => j !== i))
                  }
                >
                  Remover
                </Button>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
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
              <FormField label="Área" htmlFor="areaId" error={erros.areaId}>
                <Select
                  id="areaId"
                  options={areaOptions}
                  placeholder="Selecione…"
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
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

          <div className="flex items-center justify-between">
            <a href="/login" className="text-sm text-text-muted hover:text-text">
              Já tenho conta
            </a>
            <Button type="submit" size="lg">
              Cadastrar
            </Button>
          </div>
        </form>
      </Card.Body>
    </Card>
  );
}
