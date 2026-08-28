import { CadastroForm } from '@/features/aluno-cadastro/CadastroForm';
import { ThemeToggle } from '@/design-system/components/ThemeToggle';

export default function CadastroPage() {
  return (
    <main className="motion-fade relative flex min-h-screen items-start justify-center bg-bg p-4 sm:py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <CadastroForm />
    </main>
  );
}
