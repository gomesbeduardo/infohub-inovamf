'use client';

import { useState } from 'react';
import type { TipoUsuario } from '@/domain/types';
import { useStore, useActions } from '@/data/store';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Select } from '@/design-system/components/Select';
import { FormField } from '@/design-system/components/FormField';
import { Badge } from '@/design-system/components/Badge';

const TIPO_LABEL: Record<Extract<TipoUsuario, 'admin' | 'mentor'>, string> = {
  admin: 'Administrador',
  mentor: 'Mentor',
};

export function ContasAdmin() {
  const { state } = useStore();
  const { criarConta, editarConta, definirAtivo } = useActions();
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipo, setTipo] = useState<'admin' | 'mentor'>('mentor');

  const contas = state.usuarios.filter(
    (u) => u.tipo === 'admin' || u.tipo === 'mentor',
  );

  function fechar() {
    setAberto(false);
    setEditandoId(null);
    setNome('');
    setEmail('');
    setSenha('');
    setTelefone('');
    setTipo('mentor');
  }

  function abrirNova() {
    fechar();
    setAberto(true);
  }

  function abrirEdicao(id: string) {
    const u = state.usuarios.find((x) => x.id === id);
    if (!u) return;
    setEditandoId(id);
    setNome(u.nome);
    setEmail(u.email);
    setSenha('');
    setTelefone(u.telefone);
    setTipo(u.tipo as 'admin' | 'mentor');
    setAberto(true);
  }

  function pode() {
    const base = nome.trim() && email.trim() && telefone.trim();
    // na edição, a senha é opcional (em branco mantém a atual)
    const senhaOk = editandoId ? senha === '' || senha.length >= 6 : senha.length >= 6;
    return Boolean(base) && senhaOk;
  }

  function salvar() {
    if (!pode()) return;
    if (editandoId) {
      editarConta(editandoId, {
        nome,
        email,
        telefone,
        tipo,
        ...(senha ? { senha } : {}),
      });
    } else {
      criarConta({ nome, email, senha, telefone, tipo });
    }
    fechar();
  }

  const editando = editandoId !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Contas de acesso</h2>
        <Button size="sm" onClick={abrirNova}>
          Nova conta
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {contas.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
          >
            <div className="flex flex-col">
              <span className="font-medium text-text">{u.nome}</span>
              <span className="text-xs text-text-muted">{u.email}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge>{TIPO_LABEL[u.tipo as 'admin' | 'mentor']}</Badge>
              <span
                className={
                  u.ativo ? 'text-xs text-text-muted' : 'text-xs text-primary-text'
                }
              >
                {u.ativo ? 'Ativa' : 'Inativa'}
              </span>
              <Button size="sm" variant="ghost" onClick={() => abrirEdicao(u.id)}>
                Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => definirAtivo(u.id, !u.ativo)}
              >
                {u.ativo ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        open={aberto}
        onOpenChange={(o) => (o ? setAberto(true) : fechar())}
        title={editando ? 'Editar conta' : 'Nova conta'}
      >
        <div className="flex flex-col gap-4">
          <FormField label="Nome" htmlFor="c-nome">
            <Input id="c-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </FormField>
          <FormField label="E-mail" htmlFor="c-email">
            <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField
            label="Senha"
            htmlFor="c-senha"
            hint={editando ? 'Deixe em branco para manter a atual' : 'Mínimo 6 caracteres'}
          >
            <Input id="c-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </FormField>
          <FormField label="Telefone" htmlFor="c-tel">
            <Input id="c-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </FormField>
          <FormField label="Perfil" htmlFor="c-tipo">
            <Select
              id="c-tipo"
              options={[
                { value: 'mentor', label: 'Mentor' },
                { value: 'admin', label: 'Administrador' },
              ]}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'admin' | 'mentor')}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!pode()}>
              {editando ? 'Salvar' : 'Criar conta'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
