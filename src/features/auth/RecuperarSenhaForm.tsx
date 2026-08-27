'use client';

import { useState } from 'react';
import { useActions } from '@/data/store';
import { Logo } from '@/design-system/Logo';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { FormField } from '@/design-system/components/FormField';

export function RecuperarSenhaForm() {
  const { redefinir } = useActions();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      setMsg({ ok: false, texto: 'A nova senha deve ter ao menos 6 caracteres.' });
      return;
    }
    const ok = redefinir(email, senha);
    setMsg(
      ok
        ? { ok: true, texto: 'Senha redefinida! Você já pode entrar com a nova senha.' }
        : { ok: false, texto: 'E-mail não encontrado.' },
    );
  }

  return (
    <Card className="w-full max-w-sm overflow-hidden">
      <div className="ignition-rail" />
      <Card.Body className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-1">
          <Logo withTagline />
          <p className="text-sm text-text-muted">Recuperar senha</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="E-mail" htmlFor="rec-email">
            <Input
              id="rec-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@infohub.dev"
            />
          </FormField>
          <FormField label="Nova senha" htmlFor="rec-senha">
            <Input
              id="rec-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </FormField>

          {msg && (
            <p
              role="alert"
              className={msg.ok ? 'text-sm text-primary-text' : 'text-sm text-primary-text'}
            >
              {msg.texto}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full">
            Redefinir senha
          </Button>
        </form>

        <p className="text-xs text-text-subtle">
          Fluxo simulado (mock): num sistema real, enviaríamos um link de
          redefinição por e-mail.
        </p>

        <a href="/login" className="text-center text-sm text-primary-text hover:underline">
          Voltar ao login
        </a>
      </Card.Body>
    </Card>
  );
}
