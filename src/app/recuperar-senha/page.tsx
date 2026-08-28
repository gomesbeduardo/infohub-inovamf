import { RecuperarSenhaForm } from '@/features/auth/RecuperarSenhaForm';
import { ThemeToggle } from '@/design-system/components/ThemeToggle';

export default function RecuperarSenhaPage() {
  return (
    <main className="motion-fade relative flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <RecuperarSenhaForm />
    </main>
  );
}
