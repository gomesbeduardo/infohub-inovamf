import { AppShell } from '@/features/shell/AppShell';
import { PageHeader } from '@/design-system/components/PageHeader';
import { ContaPerfil } from '@/features/conta/ContaPerfil';

export default function ContaPage() {
  return (
    <AppShell largura="media">
      <div className="flex flex-col gap-5">
        <PageHeader title="Minha conta" subtitle="Seus dados e senha de acesso." />
        <ContaPerfil />
      </div>
    </AppShell>
  );
}
