import { AppShell } from '@/features/shell/AppShell';
import { PageHeader } from '@/design-system/components/PageHeader';
import { EquipesList } from '@/features/admin-equipes/EquipesList';

export default function AdminEquipesPage() {
  return (
    <AppShell largura="ampla">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Equipes"
          subtitle="Todas as equipes, com busca e acesso ao detalhe."
        />
        <EquipesList />
      </div>
    </AppShell>
  );
}
