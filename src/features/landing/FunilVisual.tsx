import Image from 'next/image';
import mark from '@/design-system/brand/mark.svg';
import { ETAPAS_VITRINE } from '@/features/landing/conteudo';

// Larguras relativas das barras — o funil afunila da etapa 1 à 6.
const LARGURAS = [100, 88, 74, 60, 46, 33];

/**
 * Imagem-chave do hero: o funil da jornada desenhado com o gradiente da marca
 * sobre o painel escuro de ignição. É a mesma leitura do painel do
 * administrador, em versão vitrine.
 */
export function FunilVisual() {
  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-border bg-auth-hero p-6 shadow-md sm:p-8">
      {/* dimensões literais do mark.svg — o import estático não expõe
          metadados fora do bundler do Next (ex.: no ambiente de teste). */}
      <Image
        src={mark}
        alt=""
        aria-hidden
        width={664}
        height={931}
        className="pointer-events-none absolute -right-8 -top-10 h-44 w-auto opacity-20"
      />
      <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
        A jornada
      </p>
      <p className="mt-1 font-display text-xl font-bold text-white">
        Da ideia crua ao InovAMF
      </p>

      <ol className="mt-6 space-y-2.5">
        {ETAPAS_VITRINE.map((etapa, i) => (
          <li key={etapa.numero} className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-right font-display text-xs font-semibold text-white/60">
              {etapa.numero}
            </span>
            <span
              className="flex h-9 items-center rounded-[0.625rem] px-3 text-xs font-medium text-white shadow-sm transition-[width]"
              style={{
                width: `${LARGURAS[i]}%`,
                background: `var(--stage-${etapa.numero})`,
              }}
            >
              <span className="truncate">{etapa.nome}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex items-center gap-3 rounded-[0.875rem] border border-white/15 bg-white/5 px-4 py-3">
        <span
          className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: 'var(--stage-pronta)' }}
        />
        <p className="text-sm text-white/85">
          Ao concluir a etapa 6, a equipe é marcada como{' '}
          <strong className="font-semibold text-white">
            pronta para o InovAMF
          </strong>
          .
        </p>
      </div>
    </div>
  );
}
