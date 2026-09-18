'use client';

import { type ReactNode } from 'react';
import { AuthGuard } from '@/features/auth/AuthGuard';

export default function OrientadorLayout({ children }: { children: ReactNode }) {
  return <AuthGuard permitido={['mentor']}>{children}</AuthGuard>;
}
