'use client';

import { useState } from 'react';
import { useCriarTarefa, useEtapas, useModelos } from '@/data/api/consultas';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Textarea } from '@/design-system/components/Textarea';
import { Select } from '@/design-system/components/Select';
import { FormField } from '@/design-system/components/FormField';

type Modo = 'modelo' | 'manual';

export function NovaTarefaDialog({
  equipeSlug,
  etapaAtual,
}: {
  equipeSlug: string;
  etapaAtual: number;
}) {
  const modelos = useModelos();
  const etapas = useEtapas();
  const criar = useCriarTarefa(equipeSlug);

  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<Modo>('modelo');

  const [modeloId, setModeloId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [etapaNumero, setEtapaNumero] = useState(String(etapaAtual));
  const [obrigatoria, setObrigatoria] = useState(true);
  const [dataEntrega, setDataEntrega] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const opcoesModelos = (modelos.data ?? []).map((m) => ({
    value: String(m.id),
    label: `${m.etapa} · ${m.titulo}`,
  }));
  const opcoesEtapas = (etapas.data ?? []).map((e) => ({
    value: String(e.numero),
    label: `${e.numero}. ${e.nome}`,
  }));
  const modeloSelecionado = (modelos.data ?? []).find((m) => String(m.id) === modeloId);

  function fechar() {
    setAberto(false);
    setModo('modelo');
    setModeloId('');
    setTitulo('');
    setDescricao('');
    setEtapaNumero(String(etapaAtual));
    setObrigatoria(true);
    setDataEntrega('');
    setErro(null);
  }

  function podeSalvar() {
    return modo === 'modelo' ? !!modeloId : titulo.trim() !== '' && !!dataEntrega;
  }

  function salvar() {
    if (!podeSalvar()) return;
    setErro(null);
    const body =
      modo === 'modelo'
        ? { modelo: Number(modeloId), ...(dataEntrega ? { dataEntrega } : {}) }
        : {
            titulo: titulo.trim(),
            descricao: descricao.trim() || undefined,
            etapa: Number(etapaNumero),
            dataEntrega,
            obrigatoria,
          };
    criar.mutate(body, {
      onSuccess: () => fechar(),
      onError: (err) => setErro(err instanceof Error ? err.message : 'Não foi possível criar a tarefa.'),
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setAberto(true)}>
        Nova tarefa
      </Button>

      <Dialog open={aberto} onOpenChange={(o) => (o ? setAberto(true) : fechar())} title="Nova tarefa">
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
                options={opcoesModelos}
                value={modeloId}
                onChange={(e) => setModeloId(e.target.value)}
              />
            </FormField>
          ) : (
            <>
              <FormField label="Título" htmlFor="titulo">
                <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
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
                  options={opcoesEtapas}
                  value={etapaNumero}
                  onChange={(e) => setEtapaNumero(e.target.value)}
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
              placeholder={
                modo === 'modelo' && modeloSelecionado
                  ? `prazo padrão: ${modeloSelecionado.prazoPadraoDias} dias`
                  : undefined
              }
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
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
            <Button onClick={salvar} disabled={!podeSalvar() || criar.isPending}>
              {criar.isPending ? 'Criando…' : 'Criar tarefa'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
