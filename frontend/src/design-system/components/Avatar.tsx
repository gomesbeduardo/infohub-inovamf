import { cn } from '@/design-system/cn';

function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export interface AvatarProps {
  nome: string;
  className?: string;
}

export function Avatar({ nome, className }: AvatarProps) {
  return (
    <span
      title={nome}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-text',
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
