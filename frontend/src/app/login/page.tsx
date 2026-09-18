import { LoginForm } from '@/features/auth/LoginForm';
import { AuthLayout } from '@/features/auth/AuthLayout';

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
