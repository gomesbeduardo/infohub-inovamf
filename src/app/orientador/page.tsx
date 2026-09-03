import { AppShell } from '@/features/shell/AppShell';
import { PageHeader } from '@/design-system/components/PageHeader';
import { MinhasEquipes } from '@/features/orientador/MinhasEquipes';

export default function OrientadorPage() {
  return (
    <AppShell largura="ampla">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Minhas equipes"
          subtitle="As equipes que você orienta e o que precisa da sua atenção."
        />
        <MinhasEquipes />
      </div>
    </AppShell>
  );
}
