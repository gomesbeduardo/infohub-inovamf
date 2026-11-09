'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sessao } from '@/data/api/sessao';
import { ApiError } from '@/data/api/erro';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { PasswordInput } from '@/design-system/components/PasswordInput';
import { FormField } from '@/design-system/components/FormField';
import { AlertIcon } from '@/design-system/icons';
import { homeFor } from '@/features/shell/nav';

// Contas de demonstração criadas pelo seed (SEED_DEMO=true). Ver docs/logins-demo.md.
const ACESSO_RAPIDO = [
  { rotulo: 'Admin', email: 'admin@infohub.dev', senha: 'admin123' },
  { rotulo: 'Mentor', email: 'mentor1@demo.infohub.dev', senha: 'mentor123' },
  { rotulo: 'Aluno', email: 'bruna.lopes@demo.infohub.dev', senha: 'aluno123' },
] as const;

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await autenticar(email.trim(), senha);
  }

  async function autenticar(emailConta: string, senhaConta: string) {
    setErro('');
    setEnviando(true);
    try {
      const usuario = await sessao.entrar(emailConta, senhaConta);
      router.push(homeFor(usuario.role));
    } catch (err) {
      setErro(
        err instanceof ApiError && err.status === 401
          ? 'Credenciais inválidas'
          : err instanceof ApiError
            ? err.message
            : 'Não foi possível entrar. Tente de novo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="w-full overflow-hidden shadow-md">
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
            <PasswordInput
              id="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
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

          <Button type="submit" size="lg" className="mt-1 w-full" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text">Acesso rápido</p>
          <p className="text-sm text-text-muted">
            Contas de demonstração do ambiente local.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ACESSO_RAPIDO.map((conta) => (
              <Button
                key={conta.rotulo}
                variant="secondary"
                disabled={enviando}
                onClick={() => autenticar(conta.email, conta.senha)}
              >
                {conta.rotulo}
              </Button>
            ))}
          </div>
        </div>

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
