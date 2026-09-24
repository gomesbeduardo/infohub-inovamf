import { cn } from '@/design-system/cn';
import { Badge } from '@/design-system/components/Badge';

const AREAS: Record<string, 'sust' | 'saude' | 'edu' | 'tec'> = {
  sustentabilidade: 'sust',
  saude: 'saude',
  educacao: 'edu',
  tecnologia: 'tec',
};

const chave = (area: string) =>
  area.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Área da ideia com a cor da própria categoria (Sustentabilidade verde, Saúde
 * ciano, Educação âmbar, Tecnologia violeta). O vermelho fica reservado para
 * marca e alertas. Área fora do catálogo cai na pílula neutra.
 */
export function AreaTag({ area, className }: { area: string; className?: string }) {
  const k = AREAS[chave(area)];
  if (!k) return <Badge className={className}>{area}</Badge>;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      style={{
        background: `var(--area-${k}-bg)`,
        color: `var(--area-${k}-text)`,
        borderColor: `var(--area-${k}-border)`,
      }}
    >
      {area}
    </span>
  );
}
