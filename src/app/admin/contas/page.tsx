import Link from 'next/link';
import { AppHeader } from '@/features/shell/AppHeader';
import { PageHeader } from '@/design-system/components/PageHeader';
import { ContasAdmin } from '@/features/admin-contas/ContasAdmin';

export default function ContasPage() {
  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <main className="motion-fade mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6">
        <Link href="/admin" className="text-sm text-text-muted hover:text-text">
          ← Voltar ao painel
        </Link>
        <PageHeader
          title="Contas de acesso"
          subtitle="Administradores e mentores do InfoHub."
        />
        <ContasAdmin />
      </main>
    </div>
  );
}
