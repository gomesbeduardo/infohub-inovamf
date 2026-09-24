/** Bloco de um texto legal (Termos de Uso) já quebrado para exibir. */
export type BlocoTexto = { tipo: 'titulo' | 'paragrafo'; texto: string };

/**
 * O conteúdo dos Termos vem do banco em texto simples: blocos separados por
 * linha em branco, e "## " abre uma seção. Sem HTML, então não há o que escapar.
 */
export function blocosDoTexto(conteudo: string): BlocoTexto[] {
  return conteudo
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) =>
      b.startsWith('## ')
        ? { tipo: 'titulo' as const, texto: b.slice(3).trim() }
        : { tipo: 'paragrafo' as const, texto: b.split('\n').map((l) => l.trim()).join(' ') },
    );
}
