'use client';

import { useState } from 'react';
import type { Equipe } from '@/domain/types';
import { useStore, useActions } from '@/data/store';
import { getUsuarioAtual } from '@/data/session';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Textarea } from '@/design-system/components/Textarea';
import { Select } from '@/design-system/components/Select';
import { FormField } from '@/design-system/components/FormField';

type Modo = 'modelo' | 'manual';

export function NovaTarefaDialog({ equipe }: { equipe: Equipe }) {
  const { state } = useStore();
  const { novaTarefa } = useActions();
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<Modo>('modelo');

  const [modeloId, setModeloId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [etapaId, setEtapaId] = useState(String(equipe.etapaAtualId));
  const [obrigatoria, setObrigatoria] = useState(false);
  const [dataEntrega, setDataEntrega] = useState('');

  const autorId = getUsuarioAtual(state)?.id ?? 'u-admin';

  const modelos = state.modelosTarefa.map((m) => {
    const etapa = state.etapas.find((e) => e.id === m.etapaId);
    return { value: String(m.id), label: `${etapa?.numero ?? '?'} · ${m.titulo}` };
  });
  const etapas = state.etapas.map((e) => ({
    value: String(e.id),
    label: `${e.numero}. ${e.nome}`,
  }));

  function fechar() {
    setAberto(false);
    setModeloId('');
    setTitulo('');
    setDescricao('');
    setEtapaId(String(equipe.etapaAtualId));
    setObrigatoria(false);
    setDataEntrega('');
  }

  function podeSalvar() {
    if (!dataEntrega) return false;
    return modo === 'modelo' ? !!modeloId : titulo.trim() !== '';
  }

  function salvar() {
    if (!podeSalvar()) return;
    if (modo === 'modelo') {
      novaTarefa(equipe.id, {
        modeloId: Number(modeloId),
        dataEntrega,
        criadoPor: autorId,
      });
    } else {
      novaTarefa(equipe.id, {
        titulo,
        descricao: descricao || undefined,
        etapaId: Number(etapaId),
        dataEntrega,
        obrigatoria,
        criadoPor: autorId,
      });
    }
    fechar();
  }

  return (
    <>
      <Button size="sm" onClick={() => setAberto(true)}>
        Nova tarefa
      </Button>

      <Dialog
        open={aberto}
        onOpenChange={(o) => (o ? setAberto(true) : fechar())}
        title="Nova tarefa"
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={modo === 'modelo' ? 'primary' : 'secondary'}
              onClick={() => setModo('modelo')}
            >
              De um modelo
            </Button>
            <Button
              size="sm"
              variant={modo === 'manual' ? 'primary' : 'secondary'}
              onClick={() => setModo('manual')}
            >
              Manual
            </Button>
          </div>

          {modo === 'modelo' ? (
            <FormField label="Modelo de tarefa" htmlFor="modelo">
              <Select
                id="modelo"
                placeholder="Selecione…"
                options={modelos}
                value={modeloId}
                onChange={(e) => setModeloId(e.target.value)}
              />
            </FormField>
          ) : (
            <>
              <FormField label="Título" htmlFor="titulo">
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </FormField>
              <FormField label="Instruções" htmlFor="descricao">
                <Textarea
                  id="descricao"
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </FormField>
              <FormField label="Etapa" htmlFor="etapa">
                <Select
                  id="etapa"
                  options={etapas}
                  value={etapaId}
                  onChange={(e) => setEtapaId(e.target.value)}
                />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={obrigatoria}
                  onChange={(e) => setObrigatoria(e.target.checked)}
                />
                Obrigatória para avançar de etapa
              </label>
            </>
          )}

          <FormField label="Data de entrega" htmlFor="data">
            <Input
              id="data"
              type="date"
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!podeSalvar()}>
              Criar tarefa
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
