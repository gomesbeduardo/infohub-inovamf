'use client';

import { useState, type FormEvent } from 'react';
import type { ColegaCriado } from '@/data/api/tipos';
import { useAdicionarMembro } from '@/data/api/consultas';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { FormField } from '@/design-system/components/FormField';
import { CopiarLink } from '@/design-system/components/CopiarLink';
import { PlusIcon } from '@/design-system/icons';
import { useToast } from '@/design-system/components/Toast';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Adiciona um integrante à equipe por nome + e-mail. Quem ainda não tem conta
 * ganha um link de convite (72 h) para copiar e enviar; quem já tem conta
 * entra direto (RN-03). Disponível para admin, mentor da equipe e o líder.
 */
export function AdicionarMembroDialog({ equipeSlug }: { equipeSlug: string }) {
  const adicionar = useAdicionarMembro(equipeSlug);
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [criado, setCriado] = useState<ColegaCriado | null>(null);

  function fechar() {
    setAberto(false);
    setNome('');
    setEmail('');
    setErroNome(null);
    setErroEmail(null);
    setErro(null);
    setCriado(null);
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    const em = email.trim();
    setErroNome(n ? null : 'Informe o nome do integrante.');
    setErroEmail(!em ? 'Informe o e-mail.' : EMAIL.test(em) ? null : 'E-mail inválido.');
    if (!n || !EMAIL.test(em)) return;
    setErro(null);
    adicionar.mutate(
      { nome: n, email: em },
      {
        onSuccess: (r) => {
          setCriado(r);
          toast.sucesso(`${r.nome} adicionado(a) à equipe.`);
        },
        onError: (err) => setErro(err instanceof Error ? err.message : 'Não foi possível adicionar o integrante.'),
      },
    );
  }

  return (
    <>
      <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setAberto(true)}>
        <PlusIcon size={16} />
        Adicionar integrante
      </Button>

      <Dialog
        open={aberto}
        onOpenChange={(o) => (o ? setAberto(true) : fechar())}
        title="Adicionar integrante"
        description={criado ? undefined : 'Informe nome e e-mail. Quem ainda não tem conta recebe um link de convite.'}
      >
        {criado ? (
          <div className="flex flex-col gap-4">
            {criado.conviteUrl ? (
              <>
                <p className="text-sm text-text-muted">
                  <span className="font-medium text-text">{criado.nome}</span> foi adicionado. Envie este link
                  (ex.: WhatsApp) — ele vale 72 h.
                </p>
                <CopiarLink url={criado.conviteUrl} rotulo={`Link de convite de ${criado.nome}`} />
              </>
            ) : (
              <p className="text-sm text-text-muted">
                <span className="font-medium text-text">{criado.nome}</span> já tem conta — adicionado à equipe.
              </p>
            )}
            <div className="flex justify-end">
              <Button onClick={fechar}>Concluir</Button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={salvar} noValidate>
            <FormField label="Nome" htmlFor="membro-nome" error={erroNome ?? undefined}>
              <Input id="membro-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </FormField>
            <FormField label="E-mail" htmlFor="membro-email" error={erroEmail ?? undefined}>
              <Input
                id="membro-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            {erro && (
              <p
                role="alert"
                className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
              >
                {erro}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={fechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={adicionar.isPending}>
                {adicionar.isPending ? 'Adicionando…' : 'Adicionar'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
