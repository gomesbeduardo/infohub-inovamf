'use client';

import { useRef, useState } from 'react';
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
  const [comentario, setComentario] = useState('');
  const [arquivos, setArquivos] = useState<ArquivoEntrega[]>([]);
  const idSeq = useRef(0);

  function novoId() {
    idSeq.current += 1;
    return `arq-${enviadoPor}-${tarefa.id}-${idSeq.current}`;
  }

  function fechar() {
    setAberto(false);
    setTipo('arquivo');
    setUrl('');
    setComentario('');
    setArquivos([]);
    idSeq.current = 0;
  }

  function adicionarArquivosLocais(files: FileList | null) {
    if (!files) return;
    const novos: ArquivoEntrega[] = Array.from(files).map((f) => ({
      id: novoId(),
      tipo: 'arquivo',
      nomeOriginal: f.name,
    }));
    setArquivos((xs) => [...xs, ...novos]);
  }

  function adicionarLink() {
    if (url.trim() === '') return;
    setArquivos((xs) => [
      ...xs,
      { id: novoId(), tipo: 'link', urlExterna: url.trim() },
    ]);
    setUrl('');
  }

  function removerArquivo(id: string) {
    setArquivos((xs) => xs.filter((a) => a.id !== id));
  }

  function podeEnviar() {
    return arquivos.length > 0 || (tipo === 'link' && url.trim() !== '');
  }

  function enviar() {
    const finais = [...arquivos];
    // inclui um link digitado mas ainda não adicionado
    if (tipo === 'link' && url.trim() !== '') {
      finais.push({ id: novoId(), tipo: 'link', urlExterna: url.trim() });
    }
    if (finais.length === 0) return;
    enviarEntrega(tarefa.id, {
      enviadoPor,
      arquivos: finais,
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
              label="Arquivos"
              htmlFor="arquivo"
              hint="Pode selecionar mais de um. No mock, guardamos só o nome."
            >
              <Input
                id="arquivo"
                type="file"
                multiple
                onChange={(e) => adicionarArquivosLocais(e.target.files)}
              />
            </FormField>
          ) : (
            <FormField label="URL do link" htmlFor="url">
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
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
          )}

          {arquivos.length > 0 && (
            <ul className="flex flex-col gap-1">
              {arquivos.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-surface-sunken px-2.5 py-1.5 text-xs text-text-muted"
                >
                  <span className="truncate">
                    {a.tipo === 'link' ? a.urlExterna : a.nomeOriginal}
                  </span>
                  <button
                    type="button"
                    onClick={() => removerArquivo(a.id)}
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
