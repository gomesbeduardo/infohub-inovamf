import { AppShell } from '@/features/shell/AppShell';
import { PageHeader } from '@/design-system/components/PageHeader';
import { DashboardIndicadores } from '@/features/admin-dashboard/DashboardIndicadores';
import { Funil } from '@/features/admin-funil/Funil';

export default function AdminPage() {
  return (
    <AppShell largura="ampla">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Painel"
          subtitle="Visão consolidada e funil das equipes."
        />
        <DashboardIndicadores />
        <Funil />
      </div>
    </AppShell>
  );
}
