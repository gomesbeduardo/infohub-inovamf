'use client';

import type { StatusTarefa } from '@/domain/types';
import type { FiltrosEquipes } from '@/data/api/tipos';
import { useAreas, useCiclos, useUsuarios } from '@/data/api/consultas';
import { STATUS_TAREFA_LABEL } from '@/domain/labels';
import { CURSO_OPTIONS } from '@/domain/cursos';
import { Input } from '@/design-system/components/Input';
import { Select } from '@/design-system/components/Select';

const STATUS: StatusTarefa[] = [
  'pendente',
  'em_andamento',
  'entregue',
  'atrasada',
  'aprovada',
  'ajustar',
];

type Opcao = { value: string; label: string };

// A opção de "limpar" (value '') é uma escolha válida do filtro, então entra
// como primeira opção selecionável — não como placeholder desabilitado.
const comTodos = (label: string, opts: Opcao[]): Opcao[] => [{ value: '', label }, ...opts];

/**
 * Filtros do funil (RF-07) → `FiltrosEquipes` da API. Área e ciclo por nome,
 * mentor por slug. O escopo por papel já vem do backend.
 */
export function FiltrosBar({
  filtros,
  onChange,
  ocultarMentor = false,
}: {
  filtros: FiltrosEquipes;
  onChange: (f: FiltrosEquipes) => void;
  /** Oculta o filtro de mentor (painel do mentor). Sem ele, `useUsuarios` nem é chamado. */
  ocultarMentor?: boolean;
}) {
  const areas = (useAreas().data ?? []).map((a) => ({ value: a.nome, label: a.nome }));
  const ciclos = (useCiclos().data ?? []).map((c) => ({ value: c.nome, label: c.nome }));
  // Cursos ofertados pela AMF — lista canônica, a mesma do formulário de cadastro.
  const cursos = CURSO_OPTIONS;
  const status = STATUS.map((s) => ({ value: s, label: STATUS_TAREFA_LABEL[s] }));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Input
        aria-label="Buscar equipes"
        placeholder="Buscar por nome da ideia…"
        value={filtros.q ?? ''}
        onChange={(e) => onChange({ ...filtros, q: e.target.value })}
      />
      <Select
        aria-label="Filtrar por área"
        options={comTodos('Todas as áreas', areas)}
        value={filtros.area ?? ''}
        onChange={(e) => onChange({ ...filtros, area: e.target.value || undefined })}
      />
      <Select
        aria-label="Filtrar por curso"
        options={comTodos('Todos os cursos', cursos)}
        value={filtros.curso ?? ''}
        onChange={(e) => onChange({ ...filtros, curso: e.target.value || undefined })}
      />
      {!ocultarMentor && (
        <FiltroMentor
          value={filtros.mentor ?? ''}
          onChange={(mentor) => onChange({ ...filtros, mentor })}
        />
      )}
      <Select
        aria-label="Filtrar por status de tarefa"
        options={comTodos('Qualquer status', status)}
        value={filtros.statusTarefa ?? ''}
        onChange={(e) =>
          onChange({
            ...filtros,
            statusTarefa: (e.target.value || undefined) as StatusTarefa | undefined,
          })
        }
      />
      <Select
        aria-label="Filtrar por ciclo"
        options={comTodos('Todos os ciclos', ciclos)}
        value={filtros.ciclo ?? ''}
        onChange={(e) => onChange({ ...filtros, ciclo: e.target.value || undefined })}
      />
    </div>
  );
}

/** Componente próprio para que `useUsuarios('mentor')` (só admin) rode só quando visível. */
function FiltroMentor({
  value,
  onChange,
}: {
  value: string;
  onChange: (slug: string | undefined) => void;
}) {
  const mentores = (useUsuarios('mentor').data ?? []).map((u) => ({ value: u.slug, label: u.nome }));
  return (
    <Select
      aria-label="Filtrar por mentor"
      options={comTodos('Todos os mentores', mentores)}
      value={value}
      onChange={(e) => onChange(e.target.value || undefined)}
    />
  );
}
