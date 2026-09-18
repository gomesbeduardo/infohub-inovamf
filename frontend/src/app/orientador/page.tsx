import { AppShell } from '@/features/shell/AppShell';
import { PageHeader } from '@/design-system/components/PageHeader';
import { PainelOrientador } from '@/features/orientador/PainelOrientador';

export default function OrientadorPage() {
  return (
    <AppShell largura="ampla">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Painel do mentor"
          subtitle="Indicadores, ritmo das suas equipes e o funil para mover etapas."
        />
        <PainelOrientador />
      </div>
    </AppShell>
  );
}
