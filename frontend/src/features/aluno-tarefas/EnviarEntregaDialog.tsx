'use client';

import { useState } from 'react';
import { useEnviarEntrega } from '@/data/api/consultas';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Textarea } from '@/design-system/components/Textarea';
import { FormField } from '@/design-system/components/FormField';

const HTTPS = /^https:\/\//;
const ERRO_HTTPS = 'O link precisa começar com https://';

export function EnviarEntregaDialog({
  tarefaSlug,
  equipeSlug,
  tituloTarefa,
}: {
  tarefaSlug: string;
  equipeSlug: string;
  tituloTarefa: string;
}) {
  const enviar = useEnviarEntrega(tarefaSlug, equipeSlug);
  const [aberto, setAberto] = useState(false);
  const [url, setUrl] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [comentario, setComentario] = useState('');
  const [erroUrl, setErroUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setAberto(false);
    setUrl('');
    setLinks([]);
    setComentario('');
    setErroUrl(null);
    setErro(null);
  }

  function alterarUrl(v: string) {
    setUrl(v);
    if (erroUrl) setErroUrl(null);
  }

  function adicionarLink() {
    const v = url.trim();
    if (!v) return;
    if (!HTTPS.test(v)) {
      setErroUrl(ERRO_HTTPS);
      return;
    }
    setLinks((xs) => [...xs, v]);
    setUrl('');
  }

  function removerLink(i: number) {
    setLinks((xs) => xs.filter((_, idx) => idx !== i));
  }

  function podeEnviar() {
    return links.length > 0 || (url.trim() !== '' && HTTPS.test(url.trim()));
  }

  function enviarClique() {
    const finais = [...links];
    const v = url.trim();
    if (v) {
      if (!HTTPS.test(v)) {
        setErroUrl(ERRO_HTTPS);
        return;
      }
      finais.push(v);
    }
    if (finais.length === 0) return;
    setErro(null);
    enviar.mutate(
      { links: finais.map((u) => ({ url: u })), comentario: comentario.trim() || undefined },
      {
        onSuccess: fechar,
        onError: (err) => setErro(err instanceof Error ? err.message : 'Não foi possível enviar a entrega.'),
      },
    );
  }

  return (
    <>
      <Button size="sm" onClick={() => setAberto(true)}>
        Enviar entrega
      </Button>

      <Dialog
        open={aberto}
        onOpenChange={(o) => (o ? setAberto(true) : fechar())}
        title="Enviar entrega"
        description={tituloTarefa}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2" role="tablist">
              <Button size="sm" variant="secondary" disabled role="tab" aria-selected={false}>
                Arquivo
              </Button>
              <Button size="sm" variant="primary" disabled role="tab" aria-selected>
                Link
              </Button>
            </div>
            <span className="text-xs text-text-subtle">Envio de arquivo em breve</span>
          </div>

          <FormField
            label="URL do link"
            htmlFor="url"
            error={erroUrl ?? undefined}
            hint={erroUrl ? undefined : 'Precisa começar com https://'}
          >
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => alterarUrl(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={adicionarLink}
                disabled={url.trim() === ''}
              >
                Adicionar
              </Button>
            </div>
          </FormField>

          {links.length > 0 && (
            <ul className="flex flex-col gap-1">
              {links.map((l, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-md bg-surface-sunken px-2.5 py-1.5 text-xs text-text-muted"
                >
                  <span className="truncate">{l}</span>
                  <button
                    type="button"
                    onClick={() => removerLink(i)}
                    className="text-text-subtle hover:text-primary-text"
                    aria-label="Remover"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <FormField label="Comentário" htmlFor="comentario" hint="Opcional">
            <Textarea
              id="comentario"
              rows={2}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
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
            <Button variant="ghost" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={enviarClique} disabled={!podeEnviar() || enviar.isPending}>
              {enviar.isPending ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
