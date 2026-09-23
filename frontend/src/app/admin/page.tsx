import { Suspense } from 'react';
import { AppShell } from '@/features/shell/AppShell';
import { PageHeader } from '@/design-system/components/PageHeader';
import { DashboardIndicadores } from '@/features/admin-dashboard/DashboardIndicadores';
import { Funil } from '@/features/admin-funil/Funil';
import { AgendaAdmin } from '@/features/agenda/Agenda';

export default function AdminPage() {
  return (
    <AppShell largura="ampla">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Painel"
          subtitle="Visão consolidada e funil das equipes."
        />
        <DashboardIndicadores />
        <AgendaAdmin />
        {/* Funil usa useSearchParams (presets do dashboard) → precisa de Suspense */}
        <Suspense fallback={null}>
          <Funil />
        </Suspense>
      </div>
    </AppShell>
  );
}
