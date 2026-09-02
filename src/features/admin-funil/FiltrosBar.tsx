import { useStore } from '@/data/store';
import type { FiltrosFunil } from '@/data/repository';
import type { StatusTarefa } from '@/domain/types';
import { STATUS_TAREFA_LABEL } from '@/domain/labels';
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

export function FiltrosBar({
  filtros,
  onChange,
}: {
  filtros: FiltrosFunil;
  onChange: (f: FiltrosFunil) => void;
}) {
  const { state } = useStore();

  // A opção de "limpar" (value '') é uma escolha válida do filtro, então entra
  // como primeira opção selecionável — não como placeholder desabilitado.
  const comTodos = (
    label: string,
    opts: { value: string; label: string }[],
  ) => [{ value: '', label }, ...opts];

  const areas = state.areas.map((a) => ({ value: String(a.id), label: a.nome }));
  const mentores = state.usuarios
    .filter((u) => u.tipo === 'mentor' || u.tipo === 'admin')
    .map((u) => ({ value: u.id, label: u.nome }));
  const cursos = Array.from(
    new Set(state.equipes.flatMap((e) => e.membros.map((m) => m.curso))),
  ).map((c) => ({ value: c, label: c }));
  const status = STATUS.map((s) => ({ value: s, label: STATUS_TAREFA_LABEL[s] }));
  const ciclos = state.ciclos.map((c) => ({ value: String(c.id), label: c.nome }));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Input
        aria-label="Buscar equipes"
        placeholder="Buscar por nome da ideia…"
        value={filtros.busca ?? ''}
        onChange={(e) => onChange({ ...filtros, busca: e.target.value })}
      />
      <Select
        aria-label="Filtrar por área"
        options={comTodos('Todas as áreas', areas)}
        value={filtros.areaId !== undefined ? String(filtros.areaId) : ''}
        onChange={(e) =>
          onChange({
            ...filtros,
            areaId: e.target.value ? Number(e.target.value) : undefined,
          })
        }
      />
      <Select
        aria-label="Filtrar por curso"
        options={comTodos('Todos os cursos', cursos)}
        value={filtros.curso ?? ''}
        onChange={(e) =>
          onChange({ ...filtros, curso: e.target.value || undefined })
        }
      />
      <Select
        aria-label="Filtrar por mentor"
        options={comTodos('Todos os mentores', mentores)}
        value={filtros.mentorId ?? ''}
        onChange={(e) =>
          onChange({ ...filtros, mentorId: e.target.value || undefined })
        }
      />
      <Select
        aria-label="Filtrar por status de tarefa"
        options={comTodos('Qualquer status', status)}
        value={filtros.statusTarefa ?? ''}
        onChange={(e) =>
          onChange({
            ...filtros,
            statusTarefa: (e.target.value || undefined) as
              | StatusTarefa
              | undefined,
          })
        }
      />
      <Select
        aria-label="Filtrar por ciclo"
        options={comTodos('Todos os ciclos', ciclos)}
        value={filtros.cicloId !== undefined ? String(filtros.cicloId) : ''}
        onChange={(e) =>
          onChange({
            ...filtros,
            cicloId: e.target.value ? Number(e.target.value) : undefined,
          })
        }
      />
    </div>
  );
}
