import { AppShell } from '@/features/shell/AppShell';
import { DetalheEquipe } from '@/features/admin-detalhe/DetalheEquipe';

export default function EquipeDetalhePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { aba?: string | string[] };
}) {
  const aba = typeof searchParams.aba === 'string' ? searchParams.aba : undefined;
  return (
    <AppShell largura="media" back={{ href: '/admin', label: 'Voltar ao funil' }}>
      <DetalheEquipe slug={params.slug} abaInicial={aba} />
    </AppShell>
  );
}
