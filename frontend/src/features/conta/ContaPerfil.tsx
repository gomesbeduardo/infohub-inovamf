'use client';

import { useEffect, useState } from 'react';
import type { TipoUsuario } from '@/domain/types';
import { useStore, useActions } from '@/data/store';
import { getUsuarioAtual } from '@/data/session';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { FormField } from '@/design-system/components/FormField';
import { Avatar } from '@/design-system/components/Avatar';
import { Badge } from '@/design-system/components/Badge';
import { EmptyState } from '@/design-system/components/EmptyState';
import { AlertIcon, CheckIcon } from '@/design-system/icons';
import { cn } from '@/design-system/cn';

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
  const { state } = useStore();
  const { editarConta, redefinir } = useActions();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const usuario = montado ? getUsuarioAtual(state) : null;

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [msgDados, setMsgDados] = useState<Msg>(null);

  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [msgSenha, setMsgSenha] = useState<Msg>(null);

  useEffect(() => {
    if (usuario) {
      setNome(usuario.nome);
      setTelefone(usuario.telefone);
    }
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!montado) return null;
  if (!usuario) {
    return <EmptyState title="Sessão não encontrada" description="Faça login novamente." />;
  }

  function salvarDados(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setMsgDados({ ok: false, texto: 'Informe seu nome.' });
      return;
    }
    editarConta(usuario!.id, { nome: nome.trim(), telefone: telefone.trim() });
    setMsgDados({ ok: true, texto: 'Dados atualizados.' });
  }

  function alterarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      setMsgSenha({ ok: false, texto: 'A nova senha deve ter ao menos 6 caracteres.' });
      return;
    }
    if (senha !== confirma) {
      setMsgSenha({ ok: false, texto: 'As senhas não conferem.' });
      return;
    }
    redefinir(usuario!.email, senha);
    setSenha('');
    setConfirma('');
    setMsgSenha({ ok: true, texto: 'Senha alterada.' });
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
              <Badge tone="brand">{TIPO_LABEL[usuario.tipo]}</Badge>
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
              <Button type="submit">Salvar dados</Button>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nova senha" htmlFor="conta-senha">
                <Input
                  id="conta-senha"
                  type="password"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </FormField>
              <FormField label="Confirmar nova senha" htmlFor="conta-confirma">
                <Input
                  id="conta-confirma"
                  type="password"
                  autoComplete="new-password"
                  value={confirma}
                  onChange={(e) => setConfirma(e.target.value)}
                />
              </FormField>
            </div>
            <Aviso msg={msgSenha} />
            <div className="flex justify-end">
              <Button type="submit">Alterar senha</Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
}
