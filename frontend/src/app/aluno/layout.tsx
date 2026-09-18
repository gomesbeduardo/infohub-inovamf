'use client';

import { type ReactNode } from 'react';
import { AuthGuard } from '@/features/auth/AuthGuard';

export default function AlunoLayout({ children }: { children: ReactNode }) {
  return <AuthGuard permitido={['aluno']}>{children}</AuthGuard>;
}
