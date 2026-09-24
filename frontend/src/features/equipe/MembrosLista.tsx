'use client';

import { useState } from 'react';
import type { Membro } from '@/data/api/tipos';
import { useGerarConvite, useRemoverMembro } from '@/data/api/consultas';
import { formatarDataHora } from '@/domain/labels';
import { semestreCurto } from '@/domain/semestres';
import { Avatar } from '@/design-system/components/Avatar';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { CopiarLink } from '@/design-system/components/CopiarLink';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { useToast } from '@/design-system/components/Toast';

export interface MembrosListaProps {
  equipeSlug: string;
  membros: Membro[];
  /**
   * Quem vê a lista pode gerir os integrantes (admin, mentor da equipe ou o
   * líder)? Decide quem está em volta — a lista não lê a sessão.
   */
  podeGerir: boolean;
}

/** A API manda o semestre como veio do cadastro ("3" ou "3º"); mostra sempre "3º". */
function semestre(s: string | null): string {
  return s ? semestreCurto(s.replace(/º$/, '')) : '';
}

/**
 * Integrantes da equipe: nome, papel, curso/semestre e o selo "convite
 * pendente". Quem pode gerir gera um link de convite novo (72 h) para o
 * integrante pendente. Usado no detalhe (admin/mentor) e na área do aluno.
 */
export function MembrosLista({ equipeSlug, membros, podeGerir }: MembrosListaProps) {
  return (
    <ul className="flex flex-col gap-3">
      {membros.map((m) => (
        <LinhaMembro key={m.slug} equipeSlug={equipeSlug} membro={m} podeGerir={podeGerir} />
      ))}
    </ul>
  );
}

function LinhaMembro({
  equipeSlug,
  membro: m,
  podeGerir,
}: {
  equipeSlug: string;
  membro: Membro;
  podeGerir: boolean;
}) {
  const gerar = useGerarConvite(equipeSlug);
  const remover = useRemoverMembro(equipeSlug);
  const toast = useToast();
  const [convite, setConvite] = useState<{ conviteUrl: string; expiraEm: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [erroRemover, setErroRemover] = useState<string | null>(null);

  function gerarLink() {
    setErro(null);
    gerar.mutate(m.slug, {
      onSuccess: (r) => setConvite(r),
      onError: (e) => setErro(e instanceof Error ? e.message : 'Não foi possível gerar o link.'),
    });
  }

  function abrirConfirmacao() {
    setErroRemover(null);
    setConfirmando(true);
  }

  function confirmarRemocao() {
    setErroRemover(null);
    remover.mutate(m.slug, {
      onSuccess: () => {
        setConfirmando(false);
        toast.sucesso(`${m.nome} foi retirado(a) da equipe.`);
      },
      onError: (e) => setErroRemover(e instanceof Error ? e.message : 'Não foi possível retirar o integrante.'),
    });
  }

  const detalhes = [m.curso, semestre(m.semestre)].filter(Boolean).join(' · ');

  return (
    <li className="flex flex-col gap-2" data-testid={`membro-${m.slug}`}>
      <div className="flex items-center gap-3">
        <Avatar nome={m.nome} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2 text-sm text-text">
            {m.nome}
            {m.papel === 'lider' && <Badge tone="brand">Líder</Badge>}
            {m.pendente && <Badge tone="warning">convite pendente</Badge>}
          </span>
          {detalhes && <span className="text-xs text-text-muted">{detalhes}</span>}
        </div>
        {podeGerir && m.pendente && (
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={gerarLink}
            disabled={gerar.isPending}
          >
            {gerar.isPending ? 'Gerando…' : 'Gerar link'}
          </Button>
        )}
        {podeGerir && m.papel !== 'lider' && (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0"
            onClick={abrirConfirmacao}
          >
            Retirar
          </Button>
        )}
      </div>

      {convite && (
        <div className="flex flex-col gap-1 pl-11">
          <CopiarLink url={convite.conviteUrl} rotulo={`Link de convite de ${m.nome}`} />
          <span className="text-xs text-text-subtle">
            Válido até {formatarDataHora(convite.expiraEm)}. Envie ao integrante (ex.: WhatsApp).
          </span>
        </div>
      )}
      {erro && (
        <p
          role="alert"
          className="ml-11 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
        >
          {erro}
        </p>
      )}

      <Dialog
        open={confirmando}
        onOpenChange={(o) => setConfirmando(o)}
        title="Retirar integrante"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Retirar {m.nome} da equipe? A pessoa perde o acesso às tarefas desta equipe. Entregas e histórico já
            registrados continuam.
          </p>
          {erroRemover && (
            <p role="alert" className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text">
              {erroRemover}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" disabled={remover.isPending} onClick={confirmarRemocao}>
              {remover.isPending ? 'Retirando…' : 'Retirar'}
            </Button>
          </div>
        </div>
      </Dialog>
    </li>
  );
}
