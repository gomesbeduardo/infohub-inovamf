import type { TipoUsuario } from '@/domain/types';
import {
  DashboardIcon,
  UsersIcon,
  ListChecksIcon,
  LightbulbIcon,
  type IconProps,
} from '@/design-system/icons';

export interface NavItem {
  href: string;
  label: string;
  Icon: (p: IconProps) => JSX.Element;
}

/**
 * Navegação por perfil. Cada área do app expõe só os destinos do seu papel —
 * a base para uma navegação consistente conforme novas páginas entram.
 */
export function navFor(tipo: TipoUsuario): NavItem[] {
  switch (tipo) {
    case 'aluno':
      return [
        { href: '/aluno', label: 'Minha equipe', Icon: LightbulbIcon },
        { href: '/aluno/tarefas', label: 'Tarefas', Icon: ListChecksIcon },
      ];
    case 'mentor':
      return [{ href: '/admin', label: 'Painel', Icon: DashboardIcon }];
    case 'admin':
      return [
        { href: '/admin', label: 'Painel', Icon: DashboardIcon },
        { href: '/admin/contas', label: 'Contas', Icon: UsersIcon },
      ];
    default:
      return [];
  }
}
