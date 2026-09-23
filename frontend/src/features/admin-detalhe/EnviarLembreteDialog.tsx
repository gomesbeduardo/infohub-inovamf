'use client';

import { useState, type FormEvent } from 'react';
import { useEnviarLembrete } from '@/data/api/consultas';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Button } from '@/design-system/components/Button';
import { FormField } from '@/design-system/components/FormField';
import { Textarea } from '@/design-system/components/Textarea';
import { useToast } from '@/design-system/components/Toast';
import { BellIcon } from '@/design-system/icons';

/** Mesmo teto do backend (POST /equipes/:slug/lembrete). */
export const LIMITE_LEMBRETE = 500;

/** RF-20: admin ou mentor da equipe manda um lembrete avulso a todos os integrantes. */
export function EnviarLembreteDialog({ equipeSlug }: { equipeSlug: string }) {
  const enviar = useEnviarLembrete(equipeSlug);
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setAberto(false);
    setMensagem('');
    setErro(null);
  }

  function confirmar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const texto = mensagem.trim();
    enviar.mutate(texto ? { mensagem: texto } : {}, {
      onSuccess: (r) => {
        toast.sucesso(`Lembrete enviado para ${r.enfileirados} integrante${r.enfileirados === 1 ? '' : 's'}.`);
        fechar();
      },
      onError: (err) => setErro(err instanceof Error ? err.message : 'Não foi possível enviar o lembrete.'),
    });
  }

  return (
    <>
      <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setAberto(true)}>
        <BellIcon size={16} />
        Enviar lembrete
      </Button>
      <Dialog
        open={aberto}
        onOpenChange={(o) => (o ? setAberto(true) : fechar())}
        title="Enviar lembrete"
        description="Todos os integrantes ativos recebem o lembrete."
      >
        <form onSubmit={confirmar} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Mensagem (opcional)"
            htmlFor="lembrete-mensagem"
            hint={`${mensagem.length}/${LIMITE_LEMBRETE} caracteres`}
          >
            <Textarea
              id="lembrete-mensagem"
              rows={4}
              maxLength={LIMITE_LEMBRETE}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </FormField>
          {erro && (
            <p
              role="alert"
              className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
            >
              {erro}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={fechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviar.isPending}>
              {enviar.isPending ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
