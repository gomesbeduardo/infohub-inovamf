import { AppHeader } from '@/features/shell/AppHeader';
import { PageHeader } from '@/design-system/components/PageHeader';
import { DashboardIndicadores } from '@/features/admin-dashboard/DashboardIndicadores';
import { Funil } from '@/features/admin-funil/Funil';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <main className="flex flex-col gap-5 p-4 sm:p-6">
        <PageHeader
          title="Painel InfoHub → InovAMF"
          subtitle="Visão consolidada e funil das equipes."
        />
        <DashboardIndicadores />
        <Funil />
      </main>
    </div>
  );
}
