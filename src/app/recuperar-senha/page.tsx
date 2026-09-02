import { RecuperarSenhaForm } from '@/features/auth/RecuperarSenhaForm';
import { AuthLayout } from '@/features/auth/AuthLayout';

export default function RecuperarSenhaPage() {
  return (
    <AuthLayout>
      <RecuperarSenhaForm />
    </AuthLayout>
  );
}
