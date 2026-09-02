'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActions } from '@/data/store';
import { setUsuarioAtual } from '@/data/session';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { FormField } from '@/design-system/components/FormField';
import { AlertIcon } from '@/design-system/icons';

export function LoginForm() {
  const router = useRouter();
  const { login } = useActions();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const usuario = login(email, senha);
    if (!usuario) {
      setErro('Credenciais inválidas');
      return;
    }
    setUsuarioAtual(usuario);
    router.push(usuario.tipo === 'aluno' ? '/aluno' : '/admin');
  }

  return (
    <Card className="w-full overflow-hidden">
      <div className="ignition-rail" />
      <Card.Body className="flex flex-col gap-6 p-7">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-text">Acesse sua conta</h1>
          <p className="text-sm text-text-muted">
            Bem-vindo de volta ao InfoHub.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@infohub.dev"
              autoComplete="email"
              spellCheck={false}
            />
          </FormField>

          <FormField label="Senha" htmlFor="senha">
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
            />
          </FormField>

          {erro && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
            >
              <AlertIcon size={16} className="shrink-0" />
              {erro}
            </p>
          )}

          <Button type="submit" size="lg" className="mt-1 w-full">
            Entrar
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <a href="/recuperar-senha" className="text-text-muted hover:text-text">
            Esqueci a senha
          </a>
          <a
            href="/cadastro"
            className="font-medium text-primary-text hover:underline"
          >
            Criar conta
          </a>
        </div>
      </Card.Body>
    </Card>
  );
}
