'use client';

import { type ReactNode } from 'react';
import { AuthGuard } from '@/features/auth/AuthGuard';

export default function ContaLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard permitido={['admin', 'mentor', 'aluno']}>{children}</AuthGuard>
  );
}
