'use client';

import { useRouter } from 'next/navigation';
import type { ColegaCriado } from '@/data/api/tipos';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { CopiarLink } from '@/design-system/components/CopiarLink';

export interface LinksConviteProps {
  nomeIdeia: string;
  colegas: ColegaCriado[];
}

/**
 * Tela de sucesso do cadastro: mostra o link de convite (72 h) de cada colega
 * para copiar e enviar (ex.: WhatsApp). Colega que já tinha conta (RN-03)
 * entra direto na equipe e não recebe link.
 */
export function LinksConvite({ nomeIdeia, colegas }: LinksConviteProps) {
  const router = useRouter();

  return (
    <Card className="w-full overflow-hidden shadow-md">
      <Card.Header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text">Equipe criada!</h1>
        <p className="text-sm text-text-muted">{nomeIdeia}</p>
      </Card.Header>

      <Card.Body className="flex flex-col gap-4">
        {colegas.length > 0 && (
          <>
            <p className="text-sm text-text-muted">
              Envie este link para cada integrante (ex.: WhatsApp). O link vale 72 h.
            </p>
            <ul className="flex flex-col gap-3">
              {colegas.map((c) => (
                <li key={c.slug} className="flex flex-col gap-2 rounded-[0.625rem] border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-text">{c.nome}</p>
                    <p className="text-xs text-text-muted">{c.email}</p>
                  </div>
                  {c.conviteUrl ? (
                    <CopiarLink url={c.conviteUrl} rotulo={`Link de convite de ${c.nome}`} />
                  ) : (
                    <span className="text-xs text-text-muted">já tem conta — entrou na equipe</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        <Button type="button" size="lg" onClick={() => router.push('/aluno')}>
          Ir para minha equipe
        </Button>
      </Card.Body>
    </Card>
  );
}
