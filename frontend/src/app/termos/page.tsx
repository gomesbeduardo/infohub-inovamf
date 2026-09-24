import type { Metadata } from 'next';
import { TermosUso } from '@/features/legal/TermosUso';

export const metadata: Metadata = { title: 'Termos de Uso · InfoHub' };

export default function TermosPage() {
  return <TermosUso />;
}
