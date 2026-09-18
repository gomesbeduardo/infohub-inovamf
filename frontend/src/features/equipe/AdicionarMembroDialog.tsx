'use client';

import { useState } from 'react';
import { useActions } from '@/data/store';
import { CURSO_OPTIONS } from '@/domain/cursos';
import { SEMESTRE_LABEL, SEMESTRE_OPTIONS } from '@/domain/semestres';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Select } from '@/design-system/components/Select';
import { FormField } from '@/design-system/components/FormField';
import { PlusIcon } from '@/design-system/icons';

/**
 * Adiciona um integrante à equipe. Disponível para quem gerencia a equipe
 * (mentor/admin) e para o líder da própria equipe.
 */
export function AdicionarMembroDialog({ equipeId }: { equipeId: string }) {
  const { adicionarMembro } = useActions();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [curso, setCurso] = useState('');
  const [semestre, setSemestre] = useState('');
  const [erro, setErro] = useState('');

  function fechar() {
    setAberto(false);
    setNome('');
    setCurso('');
    setSemestre('');
    setErro('');
  }

  function salvar() {
    if (!nome.trim()) {
      setErro('Informe o nome do integrante.');
      return;
    }
    if (!curso) {
      setErro('Escolha o curso.');
      return;
    }
    adicionarMembro(equipeId, { nome, curso, semestre });
    fechar();
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        className="gap-1.5"
        onClick={() => setAberto(true)}
      >
        <PlusIcon size={16} />
        Adicionar integrante
      </Button>

      <Dialog
        open={aberto}
        onOpenChange={(o) => (o ? setAberto(true) : fechar())}
        title="Adicionar integrante"
        description="Inclua um novo membro na equipe."
      >
        <div className="flex flex-col gap-4">
          <FormField
            label="Nome"
            htmlFor="membro-nome"
            error={erro && !nome.trim() ? erro : undefined}
          >
            <Input
              id="membro-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </FormField>
          <FormField
            label="Curso"
            htmlFor="membro-curso"
            error={erro && nome.trim() && !curso ? erro : undefined}
          >
            <Select
              id="membro-curso"
              placeholder="Selecione…"
              options={CURSO_OPTIONS}
              value={curso}
              onChange={(e) => setCurso(e.target.value)}
            />
          </FormField>
          <FormField
            label={SEMESTRE_LABEL}
            htmlFor="membro-semestre"
            hint="Opcional"
          >
            <Select
              id="membro-semestre"
              placeholder="Selecione…"
              options={SEMESTRE_OPTIONS}
              value={semestre}
              onChange={(e) => setSemestre(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={salvar}>Adicionar</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
