import { CadastroForm } from '@/features/aluno-cadastro/CadastroForm';
import { AuthLayout } from '@/features/auth/AuthLayout';

export default function CadastroPage() {
  return (
    <AuthLayout formWidth="xl">
      <CadastroForm />
    </AuthLayout>
  );
}
