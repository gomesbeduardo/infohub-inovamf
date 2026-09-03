import { AppShell } from '@/features/shell/AppShell';
import { DetalheEquipe } from '@/features/admin-detalhe/DetalheEquipe';

export default function OrientadorEquipePage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <AppShell
      largura="media"
      back={{ href: '/orientador', label: 'Voltar às minhas equipes' }}
    >
      <DetalheEquipe slug={params.slug} />
    </AppShell>
  );
}
