'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/design-system/cn';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { CheckIcon } from '@/design-system/icons';

export interface CopiarLinkProps {
  url: string;
  /** Nome acessível do campo com o link. */
  rotulo?: string;
  className?: string;
}

type Estado = 'ocioso' | 'copiado' | 'falhou';

/**
 * Mostra um link num campo só-leitura com o botão "Copiar". Usa a Clipboard API
 * quando existe; em contexto inseguro (deploy em HTTP puro não tem
 * `navigator.clipboard`) ou se a cópia falhar, seleciona o texto do campo e
 * pede para o usuário copiar manualmente.
 */
export function CopiarLink({ url, rotulo = 'Link de convite', className }: CopiarLinkProps) {
  const campo = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>('ocioso');

  useEffect(() => {
    if (estado !== 'copiado') return;
    const t = setTimeout(() => setEstado('ocioso'), 2000);
    return () => clearTimeout(t);
  }, [estado]);

  function selecionar() {
    campo.current?.focus();
    campo.current?.select();
  }

  async function copiar() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API indisponível');
      await navigator.clipboard.writeText(url);
      setEstado('copiado');
    } catch {
      selecionar();
      setEstado('falhou');
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-2">
        <Input
          ref={campo}
          readOnly
          value={url}
          aria-label={rotulo}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 min-w-0 flex-1 text-xs"
        />
        <Button type="button" variant="secondary" size="sm" className="shrink-0 gap-1.5" onClick={copiar}>
          {estado === 'copiado' ? (
            <>
              <CheckIcon size={16} className="shrink-0" />
              Copiado!
            </>
          ) : (
            'Copiar'
          )}
        </Button>
      </div>
      {estado === 'falhou' && (
        <p role="status" className="text-xs text-text-muted">
          Não foi possível copiar automaticamente — selecione e copie o link.
        </p>
      )}
    </div>
  );
}
