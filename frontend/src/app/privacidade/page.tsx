import type { Metadata } from 'next';
import { Privacidade } from '@/features/legal/Privacidade';

export const metadata: Metadata = { title: 'Política de Privacidade · InfoHub' };

export default function PrivacidadePage() {
  return <Privacidade />;
}
