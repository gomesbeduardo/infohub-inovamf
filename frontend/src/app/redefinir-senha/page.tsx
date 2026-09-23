import { Suspense } from 'react';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { RedefinirSenhaForm } from '@/features/auth/RedefinirSenhaForm';

export default function RedefinirSenhaPage() {
  return (
    <AuthLayout formWidth="sm">
      {/* RedefinirSenhaForm usa useSearchParams (?token=) → precisa de Suspense */}
      <Suspense fallback={null}>
        <RedefinirSenhaForm />
      </Suspense>
    </AuthLayout>
  );
}
