import { AppShell } from '@/features/shell/AppShell';
import { PageHeader } from '@/design-system/components/PageHeader';
import { ContasAdmin } from '@/features/admin-contas/ContasAdmin';

export default function ContasPage() {
  return (
    <AppShell largura="media">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Contas de acesso"
          subtitle="Administradores e mentores do InfoHub."
        />
        <ContasAdmin />
      </div>
    </AppShell>
  );
}
