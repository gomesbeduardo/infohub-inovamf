'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActions } from '@/data/store';
import { setUsuarioAtual } from '@/data/session';
import { Logo } from '@/design-system/Logo';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { FormField } from '@/design-system/components/FormField';

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
    <Card className="w-full max-w-sm">
      <Card.Body className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-1">
          <Logo withTagline />
          <p className="text-sm text-text-muted">Acesse sua conta</p>
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
            <p role="alert" className="text-sm text-primary-text">
              {erro}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full">
            Entrar
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-text-muted hover:text-text"
            onClick={() => setErro('Recuperação de senha ainda não disponível.')}
          >
            Esqueci a senha
          </button>
          <a href="/cadastro" className="font-medium text-primary-text hover:underline">
            Criar conta
          </a>
        </div>
      </Card.Body>
    </Card>
  );
}
