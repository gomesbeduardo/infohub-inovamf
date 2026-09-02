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

/** Rota inicial de cada perfil — onde o login/guarda leva o usuário. */
export function homeFor(tipo: TipoUsuario): string {
  switch (tipo) {
    case 'aluno':
      return '/aluno';
    case 'mentor':
      return '/orientador';
    default:
      return '/admin';
  }
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
      return [{ href: '/orientador', label: 'Minhas equipes', Icon: UsersIcon }];
    case 'admin':
      return [
        { href: '/admin', label: 'Painel', Icon: DashboardIcon },
        { href: '/admin/contas', label: 'Contas', Icon: UsersIcon },
      ];
    default:
      return [];
  }
}
