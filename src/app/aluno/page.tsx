import { AppShell } from '@/features/shell/AppShell';
import { PageHeader } from '@/design-system/components/PageHeader';
import { MinhasTarefas } from '@/features/aluno-tarefas/MinhasTarefas';

export default function AlunoPage() {
  return (
    <AppShell largura="estreita">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Minhas tarefas"
          subtitle="Acompanhe e envie suas entregas."
        />
        <MinhasTarefas />
      </div>
    </AppShell>
  );
}
