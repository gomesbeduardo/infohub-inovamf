import { AppShell } from '@/features/shell/AppShell';
import { PageHeader } from '@/design-system/components/PageHeader';
import { MinhaEquipe } from '@/features/aluno-equipe/MinhaEquipe';

export default function AlunoPage() {
  return (
    <AppShell largura="media">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Minha equipe"
          subtitle="Sua ideia e o progresso dela no funil."
        />
        <MinhaEquipe />
      </div>
    </AppShell>
  );
}
