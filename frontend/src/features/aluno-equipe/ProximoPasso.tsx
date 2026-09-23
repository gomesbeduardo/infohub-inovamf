import Link from 'next/link';
import type { EquipeDetalhe, Pendencia } from '@/data/api/tipos';
import { Card } from '@/design-system/components/Card';
import { CheckIcon } from '@/design-system/icons';
import { POSICAO_PRONTA, chavePendencia, posicaoDe } from '@/features/funil/DialogoMover';

const MOTIVO: Record<Extract<Pendencia, { tipo: 'integrante' }>['motivo'], string> = {
  convite_pendente: 'ainda não aceitou o convite',
  dados_incompletos: 'precisa completar curso e semestre',
};

function ItemPendencia({ p }: { p: Pendencia }) {
  if (p.tipo === 'tarefa') {
    return (
      <Link
        href={`/aluno/tarefas#tarefa-${p.slug}`}
        className="rounded-sm text-primary-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
      >
        {p.titulo}
      </Link>
    );
  }
  if (p.tipo === 'entregavel') return <span>{p.titulo} — o mentor ainda vai criar esta tarefa</span>;
  return (
    <span>
      {p.nome} {MOTIVO[p.motivo]}
    </span>
  );
}

/**
 * Card "Próximo passo" (B3) da área do aluno: a etapa atual e o que falta para
 * avançar — as MESMAS pendências que o backend usa na RN-01 (e na RN-02, na
 * Etapa 6). Cada tarefa leva direto a ela em /aluno/tarefas.
 */
export function ProximoPasso({ equipe }: { equipe: EquipeDetalhe }) {
  const pronta = posicaoDe(equipe) === POSICAO_PRONTA;
  const pendencias = equipe.pendenciasParaAvancar;

  return (
    <Card>
      <Card.Header>
        <h3 className="text-sm font-semibold text-text">Próximo passo</h3>
      </Card.Header>
      <Card.Body className="flex flex-col gap-3 text-sm">
        {pronta ? (
          <p className="flex items-center gap-2 text-text">
            <CheckIcon size={16} className="shrink-0 text-success-text" />
            Sua equipe está pronta para o InovAMF.
          </p>
        ) : (
          <>
            <p className="text-text-muted">
              Vocês estão em{' '}
              <span className="font-medium text-text">
                {equipe.etapa.numero}. {equipe.etapa.nome}
              </span>
              .
            </p>
            {pendencias.length === 0 ? (
              <p className="flex items-center gap-2 text-text">
                <CheckIcon size={16} className="shrink-0 text-success-text" />
                Tudo entregue — aguardando a avaliação do mentor
              </p>
            ) : (
              <>
                <p className="font-medium text-text">Para avançar, falta:</p>
                <ul
                  data-testid="proximo-passo-pendencias"
                  className="flex list-disc flex-col gap-1 pl-5 text-text-muted"
                >
                  {pendencias.map((p) => (
                    <li key={chavePendencia(p)}>
                      <ItemPendencia p={p} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}
