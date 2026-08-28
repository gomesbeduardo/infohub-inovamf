import { AppHeader } from '@/features/shell/AppHeader';
import { PageHeader } from '@/design-system/components/PageHeader';
import { MinhasTarefas } from '@/features/aluno-tarefas/MinhasTarefas';

export default function AlunoPage() {
  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <main className="motion-fade mx-auto flex max-w-2xl flex-col gap-5 p-4 sm:p-6">
        <PageHeader
          title="Minhas tarefas"
          subtitle="Acompanhe e envie suas entregas."
        />
        <MinhasTarefas />
      </main>
    </div>
  );
}
