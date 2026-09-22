import { Suspense } from 'react';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { AceitarConviteForm } from '@/features/auth/AceitarConviteForm';

export default function ConvitePage() {
  return (
    <AuthLayout formWidth="sm">
      {/* AceitarConviteForm usa useSearchParams (?token=) → precisa de Suspense */}
      <Suspense fallback={null}>
        <AceitarConviteForm />
      </Suspense>
    </AuthLayout>
  );
}
