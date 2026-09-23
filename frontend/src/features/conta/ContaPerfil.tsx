'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { TipoUsuario } from '@/domain/types';
import { useAtualizarMe, useMe, useTrocarSenha } from '@/data/api/consultas';
import { ApiError } from '@/data/api/erro';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { PasswordInput } from '@/design-system/components/PasswordInput';
import { FormField } from '@/design-system/components/FormField';
import { Avatar } from '@/design-system/components/Avatar';
import { Badge } from '@/design-system/components/Badge';
import { AlertIcon, CheckIcon } from '@/design-system/icons';
import { cn } from '@/design-system/cn';
import { useToast } from '@/design-system/components/Toast';

const TIPO_LABEL: Record<TipoUsuario, string> = {
  admin: 'Administração',
  mentor: 'Orientador(a)',
  aluno: 'Aluno(a)',
};

type Msg = { ok: boolean; texto: string } | null;

function Aviso({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p
      role="alert"
      className={cn(
        'flex items-center gap-2 rounded-[0.625rem] px-3 py-2 text-sm font-medium',
        msg.ok ? 'bg-success-soft text-success-text' : 'bg-danger-soft text-danger-text',
      )}
    >
      {msg.ok ? <CheckIcon size={16} className="shrink-0" /> : <AlertIcon size={16} className="shrink-0" />}
      {msg.texto}
    </p>
  );
}

export function ContaPerfil() {
  const consulta = useMe();
  const atualizar = useAtualizarMe();
  const trocarSenha = useTrocarSenha();
  const toast = useToast();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [msgDados, setMsgDados] = useState<Msg>(null);

  const [atual, setAtual] = useState('');
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [msgSenha, setMsgSenha] = useState<Msg>(null);

  useEffect(() => {
    if (consulta.data) {
      setNome(consulta.data.nome);
      setTelefone(consulta.data.telefone);
    }
  }, [consulta.data?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (consulta.isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
        <p role="alert" className="text-sm font-medium text-danger-text">
          {consulta.error.message}
        </p>
        <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (consulta.isPending || !consulta.data) {
    return <p className="px-1 py-10 text-center text-sm text-text-muted">Carregando…</p>;
  }

  const usuario = consulta.data;

  function salvarDados(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setMsgDados({ ok: false, texto: 'Informe seu nome.' });
      return;
    }
    setMsgDados(null);
    atualizar.mutate(
      { nome: nome.trim(), telefone: telefone.trim() },
      {
        onSuccess: () => toast.sucesso('Dados atualizados.'),
        onError: (err) =>
          setMsgDados({ ok: false, texto: err instanceof Error ? err.message : 'Não foi possível salvar.' }),
      },
    );
  }

  function alterarSenha(e: FormEvent) {
    e.preventDefault();
    if (!atual) {
      setMsgSenha({ ok: false, texto: 'Informe a senha atual.' });
      return;
    }
    if (senha.length < 8) {
      setMsgSenha({ ok: false, texto: 'A nova senha deve ter ao menos 8 caracteres.' });
      return;
    }
    if (senha !== confirma) {
      setMsgSenha({ ok: false, texto: 'As senhas não conferem.' });
      return;
    }
    setMsgSenha(null);
    trocarSenha.mutate(
      { atual, nova: senha },
      {
        onSuccess: () => {
          setAtual('');
          setSenha('');
          setConfirma('');
          toast.sucesso('Senha alterada.');
        },
        onError: (err) => {
          const texto =
            err instanceof ApiError && err.code === 'SENHA_ATUAL_INVALIDA'
              ? 'Senha atual incorreta.'
              : err instanceof Error
                ? err.message
                : 'Não foi possível alterar a senha.';
          setMsgSenha({ ok: false, texto });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <Card.Header className="flex items-center gap-3">
          <Avatar nome={usuario.nome} className="h-11 w-11 text-sm" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-text">{usuario.nome}</span>
            <span className="flex items-center gap-2 text-xs text-text-muted">
              {usuario.email}
              <Badge tone="brand">{TIPO_LABEL[usuario.role]}</Badge>
            </span>
          </div>
        </Card.Header>
        <Card.Body>
          <form onSubmit={salvarDados} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nome" htmlFor="conta-nome">
                <Input id="conta-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </FormField>
              <FormField label="Telefone" htmlFor="conta-tel">
                <Input
                  id="conta-tel"
                  type="tel"
                  autoComplete="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </FormField>
            </div>
            <Aviso msg={msgDados} />
            <div className="flex justify-end">
              <Button type="submit" disabled={atualizar.isPending}>
                {atualizar.isPending ? 'Salvando…' : 'Salvar dados'}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <h2 className="text-sm font-semibold text-text">Senha</h2>
        </Card.Header>
        <Card.Body>
          <form onSubmit={alterarSenha} className="flex flex-col gap-4" noValidate>
            <FormField label="Senha atual" htmlFor="conta-senha-atual">
              <PasswordInput
                id="conta-senha-atual"
                autoComplete="current-password"
                value={atual}
                onChange={(e) => setAtual(e.target.value)}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nova senha" htmlFor="conta-senha" hint="Mínimo 8 caracteres">
                <PasswordInput
                  id="conta-senha"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </FormField>
              <FormField label="Confirmar nova senha" htmlFor="conta-confirma">
                <PasswordInput
                  id="conta-confirma"
                  autoComplete="new-password"
                  value={confirma}
                  onChange={(e) => setConfirma(e.target.value)}
                />
              </FormField>
            </div>
            <Aviso msg={msgSenha} />
            <div className="flex justify-end">
              <Button type="submit" disabled={trocarSenha.isPending}>
                {trocarSenha.isPending ? 'Alterando…' : 'Alterar senha'}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
}
