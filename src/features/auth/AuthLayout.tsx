import { type ReactNode } from 'react';
import { Logo } from '@/design-system/Logo';
import { ThemeToggle } from '@/design-system/components/ThemeToggle';
import { CheckIcon } from '@/design-system/icons';
import { cn } from '@/design-system/cn';

/** Etapas do funil (rótulos curtos) — o que o InfoHub faz, contado como jornada. */
const ETAPAS = [
  'Envio da ideia',
  'Contato com a equipe',
  'Entendendo a ideia',
  'Proposta de valor',
  'Modelo de negócio',
  'Pitch & inscrição',
];

function FunilHero() {
  return (
    <ol className="relative flex flex-col gap-3.5">
      <span
        aria-hidden
        className="absolute bottom-3 left-[6px] top-3 w-px bg-white/20"
      />
      {ETAPAS.map((nome, i) => (
        <li key={nome} className="relative z-10 flex items-center gap-3">
          <span
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-black/20"
            style={{ background: `var(--stage-${i + 1})` }}
          />
          <span className="text-sm text-white/85">{nome}</span>
        </li>
      ))}
      <li className="relative z-10 mt-1 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ring-4 ring-black/20"
          style={{ background: 'var(--stage-pronta)' }}
        >
          <CheckIcon size={10} className="text-white" strokeWidth={3} />
        </span>
        <span className="text-sm font-semibold text-white">
          Programa InovAMF
        </span>
      </li>
    </ol>
  );
}

export interface AuthLayoutProps {
  children: ReactNode;
  /** Largura do slot do formulário (login/recuperar = sm; cadastro = xl). */
  formWidth?: 'sm' | 'xl';
}

/**
 * Casca das telas de acesso: painel-marca (o funil de ideias) à esquerda em
 * telas grandes, formulário à direita. No mobile o painel vira um cabeçalho
 * compacto e o fundo ganha o brilho da ignição.
 */
export function AuthLayout({ children, formWidth = 'sm' }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen bg-bg lg:grid lg:grid-cols-[1.05fr_1fr]">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* Painel-marca — só em telas grandes */}
      <aside className="relative hidden overflow-hidden bg-auth-hero p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <Logo variant="mono" className="[&_span]:!text-white" />
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tight xl:text-5xl">
              Da ideia à<br />inovação.
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              O InfoHub acompanha cada equipe da AMF — do envio da ideia ao
              pitch final do programa InovAMF.
            </p>
          </div>
          <FunilHero />
        </div>
        <p className="text-xs text-white/50">
          Antonio Meneghetti Faculdade · Funil de ideias empreendedoras
        </p>
      </aside>

      {/* Formulário */}
      <div className="bg-hero-glow flex min-h-screen items-center justify-center p-4 sm:p-6 lg:min-h-0 lg:bg-none">
        <div
          className={cn(
            'flex w-full flex-col items-center',
            formWidth === 'xl' ? 'max-w-2xl' : 'max-w-sm',
          )}
        >
          <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
