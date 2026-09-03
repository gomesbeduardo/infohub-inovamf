'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActions } from '@/data/store';
import { setUsuarioAtual } from '@/data/session';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Select } from '@/design-system/components/Select';
import { FormField } from '@/design-system/components/FormField';
import { AlertIcon } from '@/design-system/icons';
import { homeFor } from '@/features/shell/nav';

// Contas de demonstração (mock) — facilitam testar cada perfil.
const SENHA_DEMO = '123456';
const DEMOS: { rotulo: string; email: string }[] = [
  { rotulo: 'Admin', email: 'admin@infohub.dev' },
  { rotulo: 'Mentor', email: 'mentor@infohub.dev' },
  { rotulo: 'Aluno', email: 'aluno@infohub.dev' },
];

export function LoginForm() {
  const router = useRouter();
  const { login } = useActions();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  function preencher(emailDemo: string) {
    setEmail(emailDemo);
    setSenha(SENHA_DEMO);
    setErro('');
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const usuario = login(email, senha);
    if (!usuario) {
      setErro('Credenciais inválidas');
      return;
    }
    setUsuarioAtual(usuario);
    router.push(homeFor(usuario.tipo));
  }

  return (
    <Card className="w-full overflow-hidden shadow-md">
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

        <Select
          aria-label="Preencher com uma conta de demonstração"
          placeholder={`Conta de demonstração (senha ${SENHA_DEMO})…`}
          options={DEMOS.map((d) => ({
            value: d.email,
            label: `${d.rotulo} · ${d.email}`,
          }))}
          value=""
          onChange={(e) => {
            if (e.target.value) preencher(e.target.value);
          }}
        />
      </Card.Body>
    </Card>
  );
}
