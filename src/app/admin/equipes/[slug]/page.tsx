import Link from 'next/link';
import { AppHeader } from '@/features/shell/AppHeader';
import { DetalheEquipe } from '@/features/admin-detalhe/DetalheEquipe';

export default function EquipeDetalhePage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <main className="motion-fade flex flex-col gap-5 p-4 sm:p-6">
        <Link
          href="/admin"
          className="text-sm text-text-muted hover:text-text"
        >
          ← Voltar ao funil
        </Link>
        <DetalheEquipe slug={params.slug} />
      </main>
    </div>
  );
}
