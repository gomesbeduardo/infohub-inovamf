'use client';

import {
  forwardRef,
  useEffect,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { cn } from '@/design-system/cn';
import { Input } from '@/design-system/components/Input';
import { EyeIcon, EyeOffIcon } from '@/design-system/icons';

export type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const TECLAS_REVELAR = [' ', 'Spacebar', 'Enter'];

/**
 * Campo de senha com botão "segurar para ver": mantém a senha oculta por
 * padrão e revela o texto apenas enquanto o botão do olho é pressionado
 * (mouse, toque ou teclado), voltando a ocultar assim que é solto. Não é
 * um alternador (toggle) — o estado nunca fica "revelado" sem pressão.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, disabled, ...props }, ref) {
    const [visivel, setVisivel] = useState(false);

    // Se a janela perder o foco enquanto o botão está pressionado (ex.: o
    // usuário troca de aba/app com o mouse ainda "preso"), volta a ocultar.
    useEffect(() => {
      if (!visivel) return;
      const ocultar = () => setVisivel(false);
      window.addEventListener('blur', ocultar);
      return () => window.removeEventListener('blur', ocultar);
    }, [visivel]);

    function revelar() {
      if (!disabled) setVisivel(true);
    }
    function ocultar() {
      setVisivel(false);
    }

    function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
      if (TECLAS_REVELAR.includes(e.key)) {
        e.preventDefault();
        revelar();
      }
    }
    function onKeyUp(e: KeyboardEvent<HTMLButtonElement>) {
      if (TECLAS_REVELAR.includes(e.key)) {
        e.preventDefault();
        ocultar();
      }
    }

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visivel ? 'text' : 'password'}
          disabled={disabled}
          className={cn('pr-10', className)}
          {...props}
        />
        <button
          type="button"
          disabled={disabled}
          tabIndex={0}
          aria-label="Mostrar senha enquanto pressionado"
          aria-pressed={visivel}
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={revelar}
          onPointerUp={ocultar}
          onPointerLeave={ocultar}
          onPointerCancel={ocultar}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visivel ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>
    );
  },
);
