'use client';

import { useState, type FormEvent } from 'react';
import type { TipoUsuario } from '@/domain/types';
import type { UsuarioAdmin } from '@/data/api/tipos';
import { useCriarUsuario, useEditarUsuario, useReenviarConvite, useUsuarios } from '@/data/api/consultas';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Select } from '@/design-system/components/Select';
import { FormField } from '@/design-system/components/FormField';
import { Badge } from '@/design-system/components/Badge';
import { CopiarLink } from '@/design-system/components/CopiarLink';
import { EmptyState } from '@/design-system/components/EmptyState';

type Papel = Extract<TipoUsuario, 'admin' | 'mentor'>;

const TIPO_LABEL: Record<Papel, string> = {
  admin: 'Administrador',
  mentor: 'Mentor',
};

export function ContasAdmin() {
  const consulta = useUsuarios();
  const criar = useCriarUsuario();
  const editar = useEditarUsuario();
  const reenviar = useReenviarConvite();

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [papel, setPapel] = useState<Papel>('mentor');
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [conviteCriado, setConviteCriado] = useState<{ nome: string; url: string } | null>(null);

  const [linkPendente, setLinkPendente] = useState<{ slug: string; url: string } | null>(null);

  const contas = (consulta.data ?? []).filter((u) => u.role === 'admin' || u.role === 'mentor');

  function fechar() {
    setAberto(false);
    setEditando(null);
    setNome('');
    setEmail('');
    setTelefone('');
    setPapel('mentor');
    setErroForm(null);
    setConviteCriado(null);
  }

  function abrirNova() {
    fechar();
    setAberto(true);
  }

  function abrirEdicao(u: UsuarioAdmin) {
    fechar();
    setEditando(u);
    setNome(u.nome);
    setTelefone(u.telefone);
    setPapel(u.role === 'admin' ? 'admin' : 'mentor');
    setAberto(true);
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) {
      setErroForm('Informe o nome.');
      return;
    }
    if (editando) {
      setErroForm(null);
      editar.mutate(
        { slug: editando.slug, nome: n, telefone: telefone.trim(), tipo: papel },
        {
          onSuccess: () => fechar(),
          onError: (err) => setErroForm(err instanceof Error ? err.message : 'Não foi possível salvar a conta.'),
        },
      );
      return;
    }
    const em = email.trim();
    if (!em) {
      setErroForm('Informe o e-mail.');
      return;
    }
    setErroForm(null);
    criar.mutate(
      { nome: n, email: em, telefone: telefone.trim() || undefined, tipo: papel },
      {
        onSuccess: (r) => setConviteCriado({ nome: r.nome, url: r.conviteUrl }),
        onError: (err) => setErroForm(err instanceof Error ? err.message : 'Não foi possível criar a conta.'),
      },
    );
  }

  function alternarAtivo(u: UsuarioAdmin) {
    editar.mutate({ slug: u.slug, ativo: !u.ativo });
  }

  function novoLink(u: UsuarioAdmin) {
    setLinkPendente(null);
    reenviar.mutate(u.slug, {
      onSuccess: (r) => setLinkPendente({ slug: u.slug, url: r.conviteUrl }),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Contas de acesso</h2>
        <Button size="sm" onClick={abrirNova}>
          Nova conta
        </Button>
      </div>

      {consulta.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p role="alert" className="text-sm font-medium text-danger-text">
            {consulta.error.message}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : consulta.isPending ? (
        <p className="px-1 py-10 text-center text-sm text-text-muted">Carregando…</p>
      ) : contas.length === 0 ? (
        <EmptyState title="Nenhuma conta encontrada" description="Crie a primeira conta de administrador ou mentor." />
      ) : (
        <ul className="flex flex-col gap-2">
          {contas.map((u) => (
            <li
              key={u.slug}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-medium text-text">{u.nome}</span>
                  <span className="text-xs text-text-muted">{u.email}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Badge>{TIPO_LABEL[u.role === 'admin' ? 'admin' : 'mentor']}</Badge>
                  {!u.conviteAceito && <Badge tone="brand">Convite pendente</Badge>}
                  <span className={u.ativo ? 'text-xs text-text-muted' : 'text-xs text-primary-text'}>
                    {u.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => abrirEdicao(u)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={editar.isPending && editar.variables?.slug === u.slug}
                    onClick={() => alternarAtivo(u)}
                  >
                    {u.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  {!u.conviteAceito && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={reenviar.isPending}
                      onClick={() => novoLink(u)}
                    >
                      Novo link
                    </Button>
                  )}
                </div>
              </div>
              {linkPendente?.slug === u.slug && (
                <div className="flex flex-col gap-1.5 border-t border-border pt-2">
                  <p className="text-xs text-text-muted">Envie este link para a pessoa definir a senha.</p>
                  <CopiarLink url={linkPendente.url} rotulo={`Link de convite de ${u.nome}`} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={aberto}
        onOpenChange={(o) => (o ? setAberto(true) : fechar())}
        title={editando ? 'Editar conta' : 'Nova conta'}
      >
        {conviteCriado ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              <span className="font-medium text-text">{conviteCriado.nome}</span> foi criado(a). Envie este link para
              a pessoa definir a senha.
            </p>
            <CopiarLink url={conviteCriado.url} rotulo={`Link de convite de ${conviteCriado.nome}`} />
            <div className="flex justify-end">
              <Button onClick={fechar}>Concluir</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={salvar} className="flex flex-col gap-4" noValidate>
            <FormField label="Nome" htmlFor="c-nome">
              <Input id="c-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </FormField>
            {!editando && (
              <FormField label="E-mail" htmlFor="c-email">
                <Input id="c-email" type="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
            )}
            <FormField label="Telefone" htmlFor="c-tel" hint="Opcional">
              <Input id="c-tel" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </FormField>
            <FormField label="Perfil" htmlFor="c-tipo">
              <Select
                id="c-tipo"
                options={[
                  { value: 'mentor', label: 'Mentor' },
                  { value: 'admin', label: 'Administrador' },
                ]}
                value={papel}
                onChange={(e) => setPapel(e.target.value as Papel)}
              />
            </FormField>

            {erroForm && (
              <p role="alert" className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text">
                {erroForm}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={fechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editando ? editar.isPending : criar.isPending}>
                {editando ? (editar.isPending ? 'Salvando…' : 'Salvar') : criar.isPending ? 'Criando…' : 'Criar conta'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
