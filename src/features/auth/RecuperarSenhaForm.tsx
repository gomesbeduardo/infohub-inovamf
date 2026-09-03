'use client';

import { useState } from 'react';
import { useStore } from '@/data/store';
import { normalizar } from '@/data/repository';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { FormField } from '@/design-system/components/FormField';
import { AlertIcon, CheckIcon } from '@/design-system/icons';
import { cn } from '@/design-system/cn';

export function RecuperarSenhaForm() {
  const { state } = useStore();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setMsg({ ok: false, texto: 'Informe seu e-mail.' });
      return;
    }
    const existe = state.usuarios.some(
      (u) => normalizar(u.email) === normalizar(email),
    );
    setMsg(
      existe
        ? { ok: true, texto: 'Enviamos um código de recuperação para o seu e-mail.' }
        : { ok: false, texto: 'E-mail não encontrado.' },
    );
  }

  return (
    <Card className="w-full overflow-hidden shadow-md">
      <div className="ignition-rail" />
      <Card.Body className="flex flex-col gap-5 p-7">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-text">Recuperar senha</h1>
          <p className="text-sm text-text-muted">
            Informe seu e-mail e enviaremos um código de recuperação.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="E-mail" htmlFor="rec-email">
            <Input
              id="rec-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@infohub.dev"
              autoComplete="email"
              spellCheck={false}
            />
          </FormField>

          {msg && (
            <p
              role="alert"
              className={cn(
                'flex items-center gap-2 rounded-[0.625rem] px-3 py-2 text-sm font-medium',
                msg.ok
                  ? 'bg-success-soft text-success-text'
                  : 'bg-danger-soft text-danger-text',
              )}
            >
              {msg.ok ? (
                <CheckIcon size={16} className="shrink-0" />
              ) : (
                <AlertIcon size={16} className="shrink-0" />
              )}
              {msg.texto}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full">
            Enviar código
          </Button>
        </form>

        <p className="text-xs text-text-subtle">
          Fluxo simulado (mock): num sistema real, enviaríamos o código de
          recuperação por e-mail.
        </p>

        <a
          href="/login"
          className="text-center text-sm text-primary-text hover:underline"
        >
          Voltar ao login
        </a>
      </Card.Body>
    </Card>
  );
}
