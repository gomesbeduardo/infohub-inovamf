'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRedefinirSenha } from '@/data/api/consultas';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { PasswordInput } from '@/design-system/components/PasswordInput';
import { FormField } from '@/design-system/components/FormField';
import { AlertIcon, CheckIcon } from '@/design-system/icons';

const MINIMO = 8;

/**
 * A3/RF-01: a pessoa abre o link que a coordenação gerou
 * (/redefinir-senha?token=…) e define a senha nova, com confirmação. Quem
 * valida o token (uso único, 24 h) é o backend; o erro dele aparece inline.
 */
export function RedefinirSenhaForm() {
  const token = useSearchParams().get('token') ?? '';
  const redefinir = useRedefinirSenha();
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erros, setErros] = useState<{ senha?: string; confirma?: string }>({});
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  if (!token) {
    return (
      <Card className="w-full overflow-hidden shadow-md">
        <Card.Body className="flex flex-col gap-4 p-7">
          <p
            role="alert"
            className="flex items-center gap-2 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
          >
            <AlertIcon size={16} className="shrink-0" />
            Link de redefinição inválido ou incompleto.
          </p>
          <a href="/login" className="text-center text-sm text-primary-text hover:underline">
            Voltar ao login
          </a>
        </Card.Body>
      </Card>
    );
  }

  if (concluido) {
    return (
      <Card className="w-full overflow-hidden shadow-md">
        <Card.Body className="flex flex-col gap-4 p-7">
          <p className="flex items-center gap-2 rounded-[0.625rem] bg-success-soft px-3 py-2 text-sm font-medium text-success-text">
            <CheckIcon size={16} className="shrink-0" />
            Senha redefinida. Entre com a senha nova.
          </p>
          <a href="/login" className="text-center text-sm text-primary-text hover:underline">
            Entrar
          </a>
        </Card.Body>
      </Card>
    );
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const novos: { senha?: string; confirma?: string } = {};
    if (senha.length < MINIMO) novos.senha = `A senha deve ter ao menos ${MINIMO} caracteres.`;
    if (confirma !== senha) novos.confirma = 'As senhas não coincidem.';
    setErros(novos);
    if (novos.senha || novos.confirma) return;
    setErroApi(null);
    redefinir.mutate(
      { token, senha },
      {
        onSuccess: () => setConcluido(true),
        onError: (err) => setErroApi(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.'),
      },
    );
  }

  return (
    <Card className="w-full overflow-hidden shadow-md">
      <Card.Body className="flex flex-col gap-5 p-7">
        <h1 className="text-xl font-semibold text-text">Definir nova senha</h1>
        <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
          <FormField label="Nova senha" htmlFor="rs-senha" hint={`Mínimo ${MINIMO} caracteres`} error={erros.senha}>
            <PasswordInput
              id="rs-senha"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </FormField>
          <FormField label="Confirmar nova senha" htmlFor="rs-confirma" error={erros.confirma}>
            <PasswordInput
              id="rs-confirma"
              autoComplete="new-password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
            />
          </FormField>
          {erroApi && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
            >
              <AlertIcon size={16} className="shrink-0" />
              {erroApi}
            </p>
          )}
          <Button type="submit" disabled={redefinir.isPending}>
            {redefinir.isPending ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
        </form>
        <a href="/login" className="text-center text-sm text-primary-text hover:underline">
          Voltar ao login
        </a>
      </Card.Body>
    </Card>
  );
}
