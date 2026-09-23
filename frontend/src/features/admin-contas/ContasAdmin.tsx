'use client';

import { useMemo, useState, type FormEvent } from 'react';
import type { TipoUsuario } from '@/domain/types';
import type { UsuarioAdmin } from '@/data/api/tipos';
import {
  useCriarUsuario,
  useEditarUsuario,
  useGerarRedefinicao,
  useReenviarConvite,
  useUsuarios,
} from '@/data/api/consultas';
import { useUsuario } from '@/data/api/useSessao';
import { Dialog } from '@/design-system/components/primitives/Dialog';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Select } from '@/design-system/components/Select';
import { FormField } from '@/design-system/components/FormField';
import { Badge } from '@/design-system/components/Badge';
import { CopiarLink } from '@/design-system/components/CopiarLink';
import { EmptyState } from '@/design-system/components/EmptyState';
import { useToast } from '@/design-system/components/Toast';
import { Skeleton } from '@/design-system/components/Skeleton';

type Papel = Extract<TipoUsuario, 'admin' | 'mentor'>;
type PapelFiltro = TipoUsuario | 'todos';

const PAPEL_LABEL: Record<TipoUsuario, string> = {
  admin: 'Administrador',
  mentor: 'Mentor',
  aluno: 'Aluno',
};

const FILTROS_PAPEL: Array<{ value: PapelFiltro; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'admin', label: 'Administradores' },
  { value: 'mentor', label: 'Mentores' },
  { value: 'aluno', label: 'Alunos' },
];

// Busca só de apresentação: nenhuma regra de negócio aqui. Normaliza NFD para
// ignorar acento/maiúsculas (RF apêndice Task 17).
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function apenasDigitos(s: string): string {
  return s.replace(/\D/g, '');
}

function statusLabel(u: UsuarioAdmin): string {
  if (!u.conviteAceito) return 'convite pendente';
  return u.ativo ? 'ativa' : 'inativa';
}

function corresponde(u: UsuarioAdmin, termoNorm: string, termoDigitos: string): boolean {
  if (!termoNorm) return true;
  const campos = [u.nome, u.email, PAPEL_LABEL[u.role], u.curso ?? '', u.equipe?.nomeIdeia ?? '', statusLabel(u)]
    .map(normalizar);
  if (campos.some((c) => c.includes(termoNorm))) return true;
  // "3" encontra "3º"/"3o": compara só os dígitos.
  if (termoDigitos && u.semestre) {
    const semDigitos = apenasDigitos(u.semestre);
    if (semDigitos && semDigitos.includes(termoDigitos)) return true;
  }
  return false;
}

export function ContasAdmin() {
  const consulta = useUsuarios();
  const criar = useCriarUsuario();
  const editar = useEditarUsuario();
  const reenviar = useReenviarConvite();
  const gerarRedefinicao = useGerarRedefinicao();
  const toast = useToast();
  // A própria conta não se desativa nem sai de admin (o backend também recusa).
  const eu = useUsuario();

  const [busca, setBusca] = useState('');
  const [papelFiltro, setPapelFiltro] = useState<PapelFiltro>('todos');

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [papel, setPapel] = useState<Papel>('mentor');
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [conviteCriado, setConviteCriado] = useState<{ nome: string; url: string } | null>(null);

  const [linkPendente, setLinkPendente] = useState<{ slug: string; url: string } | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [linkRedefinicao, setLinkRedefinicao] = useState<string | null>(null);
  const [erroRedefinicao, setErroRedefinicao] = useState<string | null>(null);

  const contasFiltradas = useMemo(() => {
    const termoNorm = normalizar(busca);
    const termoDigitos = apenasDigitos(busca);
    return (consulta.data ?? [])
      .filter((u) => papelFiltro === 'todos' || u.role === papelFiltro)
      .filter((u) => corresponde(u, termoNorm, termoDigitos));
  }, [consulta.data, busca, papelFiltro]);

  function fechar() {
    setAberto(false);
    setEditando(null);
    setNome('');
    setEmail('');
    setTelefone('');
    setPapel('mentor');
    setErroForm(null);
    setConviteCriado(null);
    setLinkRedefinicao(null);
    setErroRedefinicao(null);
  }

  function abrirNova() {
    fechar();
    setAberto(true);
  }

  function abrirEdicao(u: UsuarioAdmin) {
    fechar();
    setEditando(u);
    setNome(u.nome);
    setTelefone(u.telefone);
    setPapel(u.role === 'admin' ? 'admin' : 'mentor');
    setAberto(true);
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) {
      setErroForm('Informe o nome.');
      return;
    }
    if (editando) {
      setErroForm(null);
      const corpo: { slug: string; nome: string; telefone: string; tipo?: Papel } = {
        slug: editando.slug,
        nome: n,
        telefone: telefone.trim(),
      };
      // Perfil de aluno é fixo: o campo nem aparece, então não manda `tipo`.
      if (editando.role !== 'aluno') corpo.tipo = papel;
      editar.mutate(corpo, {
        onSuccess: () => fechar(),
        onError: (err) => setErroForm(err instanceof Error ? err.message : 'Não foi possível salvar a conta.'),
      });
      return;
    }
    const em = email.trim();
    if (!em) {
      setErroForm('Informe o e-mail.');
      return;
    }
    setErroForm(null);
    criar.mutate(
      { nome: n, email: em, telefone: telefone.trim() || undefined, tipo: papel },
      {
        onSuccess: (r) => {
          setConviteCriado({ nome: r.nome, url: r.conviteUrl });
          toast.sucesso(`Conta de ${r.nome} criada.`);
        },
        onError: (err) => setErroForm(err instanceof Error ? err.message : 'Não foi possível criar a conta.'),
      },
    );
  }

  function alternarAtivo(u: UsuarioAdmin) {
    setErroAcao(null);
    editar.mutate(
      { slug: u.slug, ativo: !u.ativo },
      {
        onError: (err) => setErroAcao(err instanceof Error ? err.message : 'Não foi possível atualizar a conta.'),
      },
    );
  }

  function novoLink(u: UsuarioAdmin) {
    setLinkPendente(null);
    setErroAcao(null);
    reenviar.mutate(u.slug, {
      onSuccess: (r) => setLinkPendente({ slug: u.slug, url: r.conviteUrl }),
      onError: (err) => setErroAcao(err instanceof Error ? err.message : 'Não foi possível gerar o link.'),
    });
  }

  function gerarLinkRedefinicao() {
    if (!editando) return;
    setLinkRedefinicao(null);
    setErroRedefinicao(null);
    gerarRedefinicao.mutate(editando.slug, {
      onSuccess: (r) => {
        setLinkRedefinicao(r.link);
        toast.sucesso('Link de redefinição gerado — vale 24 h.');
      },
      onError: (err) => setErroRedefinicao(err instanceof Error ? err.message : 'Não foi possível gerar o link.'),
    });
  }

  const podeRedefinir = !!editando && editando.ativo && editando.conviteAceito;
  const buscaAtiva = busca.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Contas de acesso</h2>
        <Button size="sm" onClick={abrirNova}>
          Nova conta
        </Button>
      </div>

      <Input
        type="search"
        aria-label="Buscar contas"
        placeholder="Nome, e-mail, curso, semestre, equipe…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div role="group" aria-label="Filtrar por papel" className="flex flex-wrap gap-2">
        {FILTROS_PAPEL.map((f) => (
          <Button
            key={f.value}
            type="button"
            size="sm"
            variant={papelFiltro === f.value ? 'secondary' : 'ghost'}
            aria-pressed={papelFiltro === f.value}
            onClick={() => setPapelFiltro(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {!consulta.isPending && !consulta.isError && (
        <p className="text-xs text-text-muted">
          {contasFiltradas.length} {contasFiltradas.length === 1 ? 'conta' : 'contas'}
        </p>
      )}

      {erroAcao && (
        <p role="alert" className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text">
          {erroAcao}
        </p>
      )}

      {consulta.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p role="alert" className="text-sm font-medium text-danger-text">
            {consulta.error.message}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : consulta.isPending ? (
        <Skeleton linhas={4} className="px-1 py-6" />
      ) : contasFiltradas.length === 0 ? (
        buscaAtiva ? (
          <EmptyState title={`Nenhuma conta encontrada para "${busca.trim()}"`} />
        ) : (
          <EmptyState title="Nenhuma conta encontrada" description="Crie a primeira conta de administrador ou mentor." />
        )
      ) : (
        <ul className="flex flex-col gap-2">
          {contasFiltradas.map((u) => (
            <li
              key={u.slug}
              id={`conta-${u.slug}`}
              className="flex scroll-mt-28 flex-col gap-2 rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-medium text-text">{u.nome}</span>
                  <span className="text-xs text-text-muted">{u.email}</span>
                  {(u.curso || u.semestre || u.equipe) && (
                    <span className="text-xs text-text-subtle">
                      {[u.curso, u.semestre, u.equipe?.nomeIdeia].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Badge>{PAPEL_LABEL[u.role]}</Badge>
                  {!u.conviteAceito && <Badge tone="brand">Convite pendente</Badge>}
                  <span className={u.ativo ? 'text-xs text-text-muted' : 'text-xs text-primary-text'}>
                    {u.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => abrirEdicao(u)}>
                    Editar
                  </Button>
                  {u.slug !== eu?.slug && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={editar.isPending && editar.variables?.slug === u.slug}
                      onClick={() => alternarAtivo(u)}
                    >
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  )}
                  {!u.conviteAceito && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={reenviar.isPending}
                      onClick={() => novoLink(u)}
                    >
                      Novo link
                    </Button>
                  )}
                </div>
              </div>
              {linkPendente?.slug === u.slug && (
                <div className="flex flex-col gap-1.5 border-t border-border pt-2">
                  <p className="text-xs text-text-muted">Envie este link para a pessoa definir a senha.</p>
                  <CopiarLink url={linkPendente.url} rotulo={`Link de convite de ${u.nome}`} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={aberto}
        onOpenChange={(o) => (o ? setAberto(true) : fechar())}
        title={editando ? 'Editar conta' : 'Nova conta'}
      >
        {conviteCriado ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              <span className="font-medium text-text">{conviteCriado.nome}</span> foi criado(a). Envie este link para
              a pessoa definir a senha.
            </p>
            <CopiarLink url={conviteCriado.url} rotulo={`Link de convite de ${conviteCriado.nome}`} />
            <div className="flex justify-end">
              <Button onClick={fechar}>Concluir</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={salvar} className="flex flex-col gap-4" noValidate>
            <FormField label="Nome" htmlFor="c-nome">
              <Input id="c-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </FormField>
            {!editando && (
              <FormField label="E-mail" htmlFor="c-email">
                <Input id="c-email" type="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
            )}
            <FormField label="Telefone" htmlFor="c-tel" hint="Opcional">
              <Input id="c-tel" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </FormField>
            {!(editando && editando.role === 'aluno') && (
              <FormField
                label="Perfil"
                htmlFor="c-tipo"
                hint={editando && editando.slug === eu?.slug ? 'Você não pode mudar o próprio perfil.' : undefined}
              >
                <Select
                  id="c-tipo"
                  disabled={!!editando && editando.slug === eu?.slug}
                  options={[
                    { value: 'mentor', label: 'Mentor' },
                    { value: 'admin', label: 'Administrador' },
                  ]}
                  value={papel}
                  onChange={(e) => setPapel(e.target.value as Papel)}
                />
              </FormField>
            )}

            {erroForm && (
              <p role="alert" className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text">
                {erroForm}
              </p>
            )}

            {editando && (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-text">Acesso</h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  disabled={!podeRedefinir || gerarRedefinicao.isPending}
                  aria-describedby={podeRedefinir ? undefined : 'dica-redefinir'}
                  onClick={gerarLinkRedefinicao}
                >
                  {gerarRedefinicao.isPending ? 'Gerando…' : 'Gerar link de redefinição'}
                </Button>
                {!podeRedefinir && (
                  <p id="dica-redefinir" className="text-xs text-text-muted">
                    Disponível só para conta ativa com convite aceito.
                  </p>
                )}
                {linkRedefinicao && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-text-muted">
                      Envie este link para a pessoa definir uma senha nova (uso único, vale 24 h).
                    </p>
                    <CopiarLink url={linkRedefinicao} rotulo={`Link de redefinição de ${editando.nome}`} />
                  </div>
                )}
                {erroRedefinicao && (
                  <p role="alert" className="rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text">
                    {erroRedefinicao}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={fechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editando ? editar.isPending : criar.isPending}>
                {editando ? (editar.isPending ? 'Salvando…' : 'Salvar') : criar.isPending ? 'Criando…' : 'Criar conta'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
