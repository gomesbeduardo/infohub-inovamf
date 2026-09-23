'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAgenda, useEtapas } from '@/data/api/consultas';
import type { Agenda, CartaoEquipeMesa, ItemParaAvaliar, ItemPrazo } from '@/data/api/tipos';
import { formatarDataHora } from '@/domain/labels';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { PrazoChip } from '@/design-system/components/PrazoChip';
import { Skeleton } from '@/design-system/components/Skeleton';
import { StageProgress } from '@/design-system/components/StageProgress';
import { POSICAO_PRONTA, posicaoDe } from '@/features/funil/DialogoMover';
import { tempoRelativo } from '@/features/shell/notificacoes';

// Adendo 23/09: "mesa do mentor" (/orientador) e os dois primeiros blocos no
// painel do admin. Tudo vem pronto de GET /dashboard/agenda (escopo, RN-04,
// pendências RN-01/RN-02); aqui só se apresenta.

type Base = '/admin' | '/orientador';

/** Um clique até a avaliação: o detalhe da equipe já aberto na aba Tarefas. */
const hrefTarefas = (base: Base, equipeSlug: string) => `${base}/equipes/${equipeSlug}?aba=tarefas`;

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]';
const LINHA_LINK = `flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-sunken ${FOCO}`;

function Bloco({ titulo, descricao, children }: { titulo: string; descricao: string; children: ReactNode }) {
  return (
    <Card>
      <Card.Header className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-text">{titulo}</h3>
        <p className="text-xs text-text-muted">{descricao}</p>
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-sm text-text-muted">{children}</p>;
}

function TarefaEEquipe({ titulo, equipe }: { titulo: string; equipe: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm font-medium text-text">{titulo}</span>
      <span className="truncate text-xs text-text-muted">{equipe}</span>
    </span>
  );
}

function ParaAvaliar({ itens, base }: { itens: ItemParaAvaliar[]; base: Base }) {
  return (
    <Bloco titulo="Para avaliar" descricao="Entregas esperando avaliação, do prazo mais antigo ao mais novo.">
      {itens.length === 0 ? (
        <Vazio>Nenhuma entrega esperando avaliação.</Vazio>
      ) : (
        <ul aria-label="Para avaliar" className="flex flex-col gap-1">
          {itens.map((i) => (
            <li key={i.tarefa.slug}>
              <Link href={hrefTarefas(base, i.equipe.slug)} className={LINHA_LINK}>
                <TarefaEEquipe titulo={i.tarefa.titulo} equipe={i.equipe.nomeIdeia} />
                {i.entregueEm && (
                  <span className="shrink-0 text-xs text-text-subtle">
                    {i.versao ? `v${i.versao} ` : ''}enviada {tempoRelativo(i.entregueEm)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}

function Prazos({ itens, base }: { itens: ItemPrazo[]; base: Base }) {
  return (
    <Bloco titulo="Prazos" descricao="Tarefas atrasadas e as que vencem nos próximos 7 dias.">
      {itens.length === 0 ? (
        <Vazio>Nenhum prazo vencido ou nos próximos 7 dias.</Vazio>
      ) : (
        <ul aria-label="Prazos" className="flex flex-col gap-1">
          {itens.map((i) => (
            <li key={i.tarefa.slug}>
              <Link href={hrefTarefas(base, i.equipe.slug)} className={LINHA_LINK}>
                <TarefaEEquipe titulo={i.tarefa.titulo} equipe={i.equipe.nomeIdeia} />
                <PrazoChip dataEntrega={i.dataEntrega} status={i.status} className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}

const integrantes = (n: number) => (n === 1 ? '1 integrante ativo' : `${n} integrantes ativos`);

function textoAvanco(e: CartaoEquipeMesa): string {
  if (posicaoDe(e) === POSICAO_PRONTA) return 'Pronta para o InovAMF';
  if (e.faltamParaAvancar === 0) return 'Nada pendente para avançar';
  return e.faltamParaAvancar === 1 ? 'Falta 1 item para avançar' : `Faltam ${e.faltamParaAvancar} itens para avançar`;
}

function MinhasEquipes({ equipes }: { equipes: CartaoEquipeMesa[] }) {
  const etapas = (useEtapas().data ?? []).map((e) => ({ id: e.numero, numero: e.numero, nome: e.nome }));
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text">Minhas equipes</h3>
      {equipes.length === 0 ? (
        <Vazio>Nenhuma equipe atribuída a você ainda.</Vazio>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {equipes.map((e) => (
            <Card key={e.slug} role="article" aria-label={e.nomeIdeia}>
              <Card.Body className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <Link
                    href={`/orientador/equipes/${e.slug}`}
                    className={`w-fit rounded-sm text-sm font-semibold text-text hover:underline ${FOCO}`}
                  >
                    {e.nomeIdeia}
                  </Link>
                  <span className="text-xs text-text-muted">
                    {integrantes(e.membrosAtivos)} · {textoAvanco(e)}
                  </span>
                </div>
                {etapas.length > 0 && (
                  <StageProgress etapas={etapas} atualId={e.etapa.numero} pronta={posicaoDe(e) === POSICAO_PRONTA} />
                )}
                <p className="text-xs text-text-muted">
                  {e.ultimoEvento ? (
                    <>
                      Último evento: <span className="text-text">{e.ultimoEvento.titulo}</span> ·{' '}
                      {formatarDataHora(e.ultimoEvento.em)}
                    </>
                  ) : (
                    'Sem eventos ainda.'
                  )}
                </p>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

/** Carregamento e erro da agenda num lugar só; o conteúdo recebe os dados prontos. */
function ComAgenda({ children }: { children: (a: Agenda) => ReactNode }) {
  const consulta = useAgenda();
  if (consulta.isPending) return <Skeleton linhas={4} />;
  if (consulta.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p
          role="alert"
          className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
        >
          {consulta.error.message}
        </p>
        <Button variant="secondary" onClick={() => void consulta.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  return <>{children(consulta.data)}</>;
}

/** /orientador: "Para avaliar", "Prazos" e "Minhas equipes" (só as do mentor — escopo do backend). */
export function MesaDoMentor() {
  return (
    <ComAgenda>
      {(a) => (
        <section aria-label="Mesa do mentor" className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ParaAvaliar itens={a.paraAvaliar} base="/orientador" />
            <Prazos itens={a.prazos} base="/orientador" />
          </div>
          <MinhasEquipes equipes={a.equipes} />
        </section>
      )}
    </ComAgenda>
  );
}

/** /admin: "Para avaliar" e "Prazos" de todas as equipes. */
export function AgendaAdmin() {
  return (
    <ComAgenda>
      {(a) => (
        <section aria-label="Agenda da coordenação" className="grid gap-4 lg:grid-cols-2">
          <ParaAvaliar itens={a.paraAvaliar} base="/admin" />
          <Prazos itens={a.prazos} base="/admin" />
        </section>
      )}
    </ComAgenda>
  );
}
