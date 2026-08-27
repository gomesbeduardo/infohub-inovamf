import { LoginForm } from '@/features/auth/LoginForm';
import { ThemeToggle } from '@/design-system/components/ThemeToggle';

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <LoginForm />
    </main>
  );
}
