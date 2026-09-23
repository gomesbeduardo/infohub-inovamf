'use client';

import { useState, type FormEvent } from 'react';
import { usePedirRedefinicao } from '@/data/api/consultas';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { FormField } from '@/design-system/components/FormField';
import { AlertIcon, CheckIcon, MailIcon } from '@/design-system/icons';

/**
 * RF-01 (adendo 23/09): a pessoa pede a redefinição com o e-mail da conta. A
 * resposta da API é sempre a mesma (não revela se a conta existe); a
 * coordenação vê o pedido no sino e gera o link na tela Contas. Nenhum e-mail
 * sai daqui por enquanto.
 */
export function RecuperarSenhaForm() {
  const pedir = usePedirRedefinicao();
  const [email, setEmail] = useState('');
  const [erroEmail, setErroEmail] = useState<string | undefined>(undefined);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErroEmail('Informe seu e-mail.');
      return;
    }
    setErroEmail(undefined);
    setErroApi(null);
    pedir.mutate(email.trim(), {
      onSuccess: (r) => setConfirmacao(r.mensagem),
      onError: (err) => setErroApi(err instanceof Error ? err.message : 'Não foi possível enviar o pedido.'),
    });
  }

  return (
    <Card className="w-full overflow-hidden shadow-md">
      <Card.Body className="flex flex-col gap-5 p-7">
        <h1 className="text-xl font-semibold text-text">Recuperar senha</h1>

        <p className="flex items-start gap-2 rounded-[0.625rem] bg-primary-soft px-3 py-3 text-sm font-medium text-primary-text">
          <MailIcon size={16} className="mt-0.5 shrink-0" />
          Peça a redefinição com o e-mail da sua conta: a coordenação vai te enviar um link para definir uma
          senha nova.
        </p>

        {confirmacao ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-[0.625rem] bg-success-soft px-3 py-3 text-sm font-medium text-success-text"
          >
            <CheckIcon size={16} className="mt-0.5 shrink-0" />
            {confirmacao}
          </p>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
            <FormField label="E-mail" htmlFor="rec-email" error={erroEmail}>
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
            {erroApi && (
              <p
                role="alert"
                className="flex items-center gap-2 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
              >
                <AlertIcon size={16} className="shrink-0" />
                {erroApi}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={pedir.isPending}>
              {pedir.isPending ? 'Enviando…' : 'Pedir redefinição'}
            </Button>
          </form>
        )}

        <a href="/login" className="text-center text-sm text-primary-text hover:underline">
          Voltar ao login
        </a>
      </Card.Body>
    </Card>
  );
}
