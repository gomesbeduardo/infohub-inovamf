'use client';

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { AppState, ArquivoEntrega, ResultadoAvaliacao } from '@/domain/types';
import { seed } from '@/data/fixtures';
import {
  autenticar,
  criarEquipeDoFormulario,
  adicionarMembro,
  filtrarEquipes,
  avancarEtapa,
  retrocederEtapa,
  criarTarefa,
  enviarEntrega,
  avaliarEntrega,
  calcularStatusAtraso,
  adicionarAnotacao,
  criarUsuario,
  editarUsuario,
  definirAtivoUsuario,
  redefinirSenha,
  hojeISO,
  type DadosCadastro,
  type FiltrosFunil,
  type NovaTarefaManual,
  type NovaTarefaModelo,
} from '@/data/repository';

type Action = { type: 'SET_STATE'; state: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return action.state;
    default:
      return state;
  }
}

interface StoreContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: AppState;
}) {
  // aplica o atraso automático (RN-04) sobre o seed, contra a data de hoje
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initial ?? calcularStatusAtraso(seed(), hojeISO()),
  );
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore deve ser usado dentro de <StoreProvider>');
  }
  return ctx;
}

/**
 * Ações de alto nível: cada uma chama a função pura do repositório sobre o
 * estado atual e despacha o novo estado (exceto `login`/`filtrar`, que só leem).
 */
export function useActions() {
  const { state, dispatch } = useStore();
  const set = (s: AppState) => dispatch({ type: 'SET_STATE', state: s });

  return {
    login: (email: string, senha: string) => autenticar(state, email, senha),
    cadastrar: (d: DadosCadastro) => {
      const { estado, equipe, usuario } = criarEquipeDoFormulario(state, d);
      set(estado);
      return { equipe, usuario };
    },
    filtrar: (f: FiltrosFunil) => filtrarEquipes(state, f),
    adicionarMembro: (equipeId: string, dados: { nome: string; curso: string }) =>
      set(adicionarMembro(state, equipeId, dados)),
    avancar: (
      equipeId: string,
      opts: { forcar: boolean; autorId: string; observacao?: string },
    ) => set(avancarEtapa(state, equipeId, opts)),
    retroceder: (
      equipeId: string,
      opts: { autorId: string; observacao?: string },
    ) => set(retrocederEtapa(state, equipeId, opts)),
    novaTarefa: (
      equipeId: string,
      dados: NovaTarefaManual | NovaTarefaModelo,
    ) => set(criarTarefa(state, equipeId, dados)),
    enviarEntrega: (
      tarefaId: string,
      dados: {
        enviadoPor: string;
        arquivos: ArquivoEntrega[];
        comentario?: string;
      },
    ) => set(enviarEntrega(state, tarefaId, dados)),
    avaliar: (
      entregaId: string,
      dados: {
        resultado: ResultadoAvaliacao;
        comentario?: string;
        avaliadorId: string;
      },
    ) => set(avaliarEntrega(state, entregaId, dados)),
    anotar: (
      equipeId: string,
      dados: { conteudo: string; autorId: string; etapaId?: number },
    ) => set(adicionarAnotacao(state, { equipeId, ...dados })),
    criarConta: (dados: {
      nome: string;
      email: string;
      senha: string;
      telefone: string;
      tipo: 'admin' | 'mentor';
    }) => set(criarUsuario(state, dados)),
    editarConta: (
      id: string,
      dados: Partial<{ nome: string; email: string; telefone: string; tipo: 'admin' | 'mentor'; senha: string }>,
    ) => set(editarUsuario(state, id, dados)),
    definirAtivo: (id: string, ativo: boolean) =>
      set(definirAtivoUsuario(state, id, ativo)),
    redefinir: (email: string, novaSenha: string) => {
      const { estado, ok } = redefinirSenha(state, email, novaSenha);
      if (ok) set(estado);
      return ok;
    },
  };
}
