'use client';

import { useState } from 'react';
import type { ArquivoEntrega, Tarefa } from '@/domain/types';
import { useActions } from '@/data/store';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Textarea } from '@/design-system/components/Textarea';
import { FormField } from '@/design-system/components/FormField';

type Tipo = 'arquivo' | 'link';

export function EnviarEntregaDialog({
  tarefa,
  enviadoPor,
}: {
  tarefa: Tarefa;
  enviadoPor: string;
}) {
  const { enviarEntrega } = useActions();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<Tipo>('arquivo');
  const [url, setUrl] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [comentario, setComentario] = useState('');

  function fechar() {
    setAberto(false);
    setTipo('arquivo');
    setUrl('');
    setNomeArquivo('');
    setComentario('');
  }

  function podeEnviar() {
    return tipo === 'link' ? url.trim() !== '' : nomeArquivo.trim() !== '';
  }

  function enviar() {
    if (!podeEnviar()) return;
    const arquivo: ArquivoEntrega =
      tipo === 'link'
        ? { id: `arq-${Date.now()}`, tipo: 'link', urlExterna: url }
        : { id: `arq-${Date.now()}`, tipo: 'arquivo', nomeOriginal: nomeArquivo };

    enviarEntrega(tarefa.id, {
      enviadoPor,
      arquivos: [arquivo],
      comentario: comentario || undefined,
    });
    fechar();
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
        description={tarefa.titulo}
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={tipo === 'arquivo' ? 'primary' : 'secondary'}
              onClick={() => setTipo('arquivo')}
            >
              Arquivo
            </Button>
            <Button
              size="sm"
              variant={tipo === 'link' ? 'primary' : 'secondary'}
              onClick={() => setTipo('link')}
            >
              Link
            </Button>
          </div>

          {tipo === 'arquivo' ? (
            <FormField
              label="Arquivo"
              htmlFor="arquivo"
              hint="No mock, guardamos apenas o nome do arquivo."
            >
              <Input
                id="arquivo"
                type="file"
                onChange={(e) =>
                  setNomeArquivo(e.target.files?.[0]?.name ?? '')
                }
              />
            </FormField>
          ) : (
            <FormField label="URL do link" htmlFor="url">
              <Input
                id="url"
                type="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </FormField>
          )}

          <FormField label="Comentário" htmlFor="comentario" hint="Opcional">
            <Textarea
              id="comentario"
              rows={2}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={enviar} disabled={!podeEnviar()}>
              Enviar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
