import { AlertIcon } from '@/design-system/icons';

export const ERRO_ACEITE = 'Aceite os Termos de Uso e a Política de Privacidade para continuar.';

export interface AceiteTermosProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

const link = 'font-medium text-primary-text underline underline-offset-2 hover:no-underline';

/**
 * Checkbox obrigatório de aceite (RNF-02) no cadastro e no convite. Os links
 * abrem em nova aba para quem for ler não perder o que já preencheu.
 */
export function AceiteTermos({ checked, onChange, error }: AceiteTermosProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2.5">
        <input
          id="consentimento"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'consentimento-error' : undefined}
          className="mt-0.5 size-4 shrink-0 accent-[color:var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
        />
        <label htmlFor="consentimento" className="text-sm leading-snug text-text">
          Li e aceito os{' '}
          <a href="/termos" target="_blank" rel="noopener noreferrer" className={link}>
            Termos de Uso
          </a>{' '}
          e a{' '}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer" className={link}>
            Política de Privacidade
          </a>
          .
        </label>
      </div>
      {error && (
        <p
          id="consentimento-error"
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-danger-text"
        >
          <AlertIcon size={14} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
