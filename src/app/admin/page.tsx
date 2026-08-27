import { AppHeader } from '@/features/shell/AppHeader';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Funil } from '@/features/admin-funil/Funil';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <main className="flex flex-col gap-5 p-4 sm:p-6">
        <PageHeader
          title="Funil InfoHub → InovAMF"
          subtitle="Todas as equipes por etapa da jornada."
        />
        <Funil />
      </main>
    </div>
  );
}
