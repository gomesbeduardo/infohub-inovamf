import type { Metadata } from 'next';
import { Landing } from '@/features/landing/Landing';

export const metadata: Metadata = {
  title: 'InfoHub — do esboço da ideia ao InovAMF',
  description:
    'Laboratório de empreendedorismo da Faculdade Antonio Meneghetti: seis etapas de mentoria que levam a sua ideia até o centro de inovação InovAMF. Envie a sua ideia ou entre na sua área.',
};

export default function Home() {
  return <Landing />;
}
