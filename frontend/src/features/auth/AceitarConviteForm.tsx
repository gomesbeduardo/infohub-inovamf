'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAceitarConvite, useConvite } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import { CURSO_OPTIONS } from '@/domain/cursos';
import { SEMESTRE_LABEL, SEMESTRE_OPTIONS } from '@/domain/semestres';
import type { TipoUsuario } from '@/domain/types';
import { homeFor } from '@/features/shell/nav';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { PasswordInput } from '@/design-system/components/PasswordInput';
import { Select } from '@/design-system/components/Select';
import { FormField } from '@/design-system/components/FormField';
import { AlertIcon } from '@/design-system/icons';
import { AceiteTermos, ERRO_ACEITE } from '@/features/legal/AceiteTermos';

function vazio(v?: string): boolean {
  return !v || v.trim() === '';
}

/** Mensagem amigável para os erros conhecidos do preview do convite. */
function mensagemPreview(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'INVITE_USED') return 'Este convite já foi usado — entre com sua senha.';
    if (err.code === 'INVITE_EXPIRED') return 'Convite expirado — peça um novo link ao líder ou ao mentor.';
    if (err.code === 'INVALID_INVITE') return 'Convite inválido.';
    return err.message;
  }
  return 'Não foi possível carregar o convite. Tente de novo.';
}

export function AceitarConviteForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const preview = useConvite(token);
  const aceitar = useAceitarConvite();

  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [curso, setCurso] = useState('');
  const [semestre, setSemestre] = useState('');
  const [matricula, setMatricula] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  // Sem ?token a query fica desligada (pending para sempre): avisa em vez de "Carregando…".
  if (!token) {
    return (
      <Card className="w-full overflow-hidden shadow-md">
        <Card.Body className="flex flex-col gap-4 p-7">
          <p
            role="alert"
            className="flex items-center gap-2 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
          >
            <AlertIcon size={16} className="shrink-0" />
            Link de convite inválido ou incompleto.
          </p>
          <a href="/login" className="text-center text-sm text-primary-text hover:underline">
            Entrar
          </a>
        </Card.Body>
      </Card>
    );
  }

  if (preview.isPending) {
    return (
      <Card className="w-full overflow-hidden shadow-md">
        <Card.Body className="p-7 text-sm text-text-muted">Carregando…</Card.Body>
      </Card>
    );
  }

  if (preview.isError) {
    const codigo = preview.error instanceof ApiError ? preview.error.code : undefined;
    return (
      <Card className="w-full overflow-hidden shadow-md">
        <Card.Body className="flex flex-col gap-4 p-7">
          <p
            role="alert"
            className="flex items-center gap-2 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
          >
            <AlertIcon size={16} className="shrink-0" />
            {mensagemPreview(preview.error)}
          </p>
          {codigo === 'INVITE_USED' ? (
            <a href="/login" className="text-center text-sm text-primary-text hover:underline">
              Entrar
            </a>
          ) : codigo !== 'INVITE_EXPIRED' && codigo !== 'INVALID_INVITE' ? (
            <Button type="button" variant="secondary" onClick={() => preview.refetch()}>
              Tentar de novo
            </Button>
          ) : null}
        </Card.Body>
      </Card>
    );
  }

  const dados = preview.data;
  const ehAluno = dados.role === 'aluno';
  const apiErro = aceitar.error instanceof ApiError ? aceitar.error.message : null;

  function validar(): Record<string, string> {
    const e: Record<string, string> = {};
    if (vazio(senha)) e.senha = 'Crie uma senha.';
    else if (senha.length < 8) e.senha = 'A senha deve ter ao menos 8 caracteres.';

    if (confirmarSenha !== senha) e.confirmarSenha = 'As senhas não coincidem.';
    if (vazio(telefone)) e.telefone = 'Informe um telefone.';

    if (ehAluno) {
      if (vazio(curso)) e.curso = 'Informe seu curso.';
      if (vazio(semestre)) e.semestre = 'Selecione o semestre/módulo.';
    }

    if (!consentimento) e.consentimento = ERRO_ACEITE;

    return e;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validacao = validar();
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    aceitar.mutate(
      {
        token,
        senha,
        telefone,
        ...(ehAluno ? { curso, semestre, matricula: matricula.trim() || undefined } : {}),
        consentimento: true,
      },
      { onSuccess: () => router.push(homeFor(dados.role as TipoUsuario)) },
    );
  }

  return (
    <Card className="w-full overflow-hidden shadow-md">
      <Card.Body className="flex flex-col gap-5 p-7">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-text">Complete seu cadastro</h1>
          <p className="text-sm text-text-muted">
            Convite para {dados.nome} ({dados.email}).
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="Senha" htmlFor="senha" error={erros.senha}>
            <PasswordInput id="senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </FormField>
          <FormField label="Confirmar senha" htmlFor="confirmarSenha" error={erros.confirmarSenha}>
            <PasswordInput
              id="confirmarSenha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
            />
          </FormField>
          <FormField label="Telefone" htmlFor="telefone" error={erros.telefone}>
            <Input id="telefone" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </FormField>

          {ehAluno && (
            <>
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
            </>
          )}

          <AceiteTermos
            checked={consentimento}
            onChange={setConsentimento}
            error={erros.consentimento}
          />

          {apiErro && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
            >
              <AlertIcon size={16} className="shrink-0" />
              {apiErro}
            </p>
          )}

          <Button type="submit" size="lg" className="mt-1 w-full" disabled={aceitar.isPending}>
            {aceitar.isPending ? 'Enviando…' : 'Concluir cadastro'}
          </Button>
        </form>
      </Card.Body>
    </Card>
  );
}
