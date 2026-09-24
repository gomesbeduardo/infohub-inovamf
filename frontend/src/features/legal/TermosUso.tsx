'use client';

import { useTermosVigente } from '@/data/api/consultas';
import { blocosDoTexto } from '@/domain/termos';
import { AlertIcon } from '@/design-system/icons';
import { DocumentoLegal } from './DocumentoLegal';

/** /termos: a versão vigente vem do banco (tabela termos_uso). */
export function TermosUso() {
  const termos = useTermosVigente();

  if (termos.isError) {
    return (
      <DocumentoLegal titulo="Termos de Uso">
        <p
          role="alert"
          className="flex items-center gap-2 rounded-[0.625rem] bg-danger-soft px-3 py-2 text-sm font-medium text-danger-text"
        >
          <AlertIcon size={16} className="shrink-0" />
          Não foi possível carregar os Termos de Uso. Recarregue a página.
        </p>
      </DocumentoLegal>
    );
  }

  if (!termos.data) {
    return (
      <DocumentoLegal titulo="Termos de Uso">
        <p>Carregando…</p>
      </DocumentoLegal>
    );
  }

  const { titulo, versao, conteudo } = termos.data;
  return (
    <DocumentoLegal titulo={titulo} subtitulo={`Versão ${versao}`}>
      {blocosDoTexto(conteudo).map((b, i) =>
        b.tipo === 'titulo' ? <h2 key={i}>{b.texto}</h2> : <p key={i}>{b.texto}</p>,
      )}
      <p className="mt-6 border-t border-border pt-6">
        Veja também a{' '}
        <a href="/privacidade" className="font-medium text-primary-text underline underline-offset-2 hover:no-underline">
          Política de Privacidade
        </a>
        .
      </p>
    </DocumentoLegal>
  );
}
