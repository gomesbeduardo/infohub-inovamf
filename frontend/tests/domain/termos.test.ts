import { describe, expect, it } from 'vitest';
import { blocosDoTexto } from '@/domain/termos';

describe('blocosDoTexto', () => {
  it('"## " vira título e o resto vira parágrafo', () => {
    expect(blocosDoTexto('## 1. Objeto\n\nTexto um.\n\n## 2. Conta\n\nTexto dois.')).toEqual([
      { tipo: 'titulo', texto: '1. Objeto' },
      { tipo: 'paragrafo', texto: 'Texto um.' },
      { tipo: 'titulo', texto: '2. Conta' },
      { tipo: 'paragrafo', texto: 'Texto dois.' },
    ]);
  });

  it('aceita CRLF e ignora linhas em branco extras', () => {
    expect(blocosDoTexto('\r\n\r\nA\r\nB\r\n\r\n\r\n## T\r\n')).toEqual([
      { tipo: 'paragrafo', texto: 'A B' },
      { tipo: 'titulo', texto: 'T' },
    ]);
  });
});
