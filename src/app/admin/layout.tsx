'use client';

import { type ReactNode } from 'react';
import { AuthGuard } from '@/features/auth/AuthGuard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AuthGuard permitido={['admin']}>{children}</AuthGuard>;
}
