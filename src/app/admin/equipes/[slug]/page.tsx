import { AppShell } from '@/features/shell/AppShell';
import { DetalheEquipe } from '@/features/admin-detalhe/DetalheEquipe';

export default function EquipeDetalhePage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <AppShell largura="media" back={{ href: '/admin', label: 'Voltar ao funil' }}>
      <DetalheEquipe slug={params.slug} />
    </AppShell>
  );
}
