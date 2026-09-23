import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpcoesSegmentadas } from '@/design-system/components/OpcoesSegmentadas';

const OPCOES = [
  { value: 'ideia', label: 'Apenas ideia', descricao: 'Ainda no papel' },
  { value: 'prototipo', label: 'Protótipo', descricao: 'Algo testável, mesmo simples' },
  {
    value: 'mvp_desenvolvimento',
    label: 'MVP em desenvolvimento',
    descricao: 'Produto mínimo sendo construído',
  },
  { value: 'mvp_pronto', label: 'MVP pronto', descricao: 'Já usado por pessoas reais' },
];

describe('OpcoesSegmentadas', () => {
  it('renderiza as opções como radios e a descrição de cada uma como descrição acessível', () => {
    render(
      <OpcoesSegmentadas
        name="estagio"
        legenda="Estágio da ideia"
        opcoes={OPCOES}
        value="ideia"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('group', { name: 'Estágio da ideia' })).toBeInTheDocument();
    for (const o of OPCOES) {
      expect(screen.getByRole('radio', { name: o.label })).toHaveAccessibleDescription(
        o.descricao,
      );
    }
  });

  it('mostra abaixo do controle só a descrição da opção escolhida', () => {
    const { rerender } = render(
      <OpcoesSegmentadas
        name="estagio"
        legenda="Estágio da ideia"
        opcoes={OPCOES}
        value=""
        onChange={vi.fn()}
      />,
    );
    const dica = document.querySelector('[data-dica]');
    expect(dica).toHaveTextContent('');

    rerender(
      <OpcoesSegmentadas
        name="estagio"
        legenda="Estágio da ideia"
        opcoes={OPCOES}
        value="prototipo"
        onChange={vi.fn()}
      />,
    );
    expect(document.querySelector('[data-dica]')).toHaveTextContent(
      'Algo testável, mesmo simples',
    );
  });

  it('selecionar uma opção chama onChange com o value correspondente', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <OpcoesSegmentadas
        name="estagio"
        legenda="Estágio da ideia"
        opcoes={OPCOES}
        value="ideia"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByText('Protótipo'));
    expect(onChange).toHaveBeenCalledWith('prototipo');
  });

  it('todos os radios compartilham o mesmo name e são focáveis pelo teclado', async () => {
    const user = userEvent.setup();
    render(
      <OpcoesSegmentadas
        name="estagio"
        legenda="Estágio da ideia"
        opcoes={OPCOES}
        value="ideia"
        onChange={vi.fn()}
      />,
    );

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(OPCOES.length);
    for (const r of radios) {
      expect(r).toHaveAttribute('name', 'estagio');
    }

    await user.tab();
    expect(radios[0]).toHaveFocus();
  });

  it('marca a opção selecionada como checked', () => {
    render(
      <OpcoesSegmentadas
        name="estagio"
        legenda="Estágio da ideia"
        opcoes={OPCOES}
        value="mvp_pronto"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: /mvp pronto/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /apenas ideia/i })).not.toBeChecked();
  });

  it('anuncia o erro via aria-describedby nos radios', () => {
    render(
      <OpcoesSegmentadas
        name="estagio"
        legenda="Estágio da ideia"
        opcoes={OPCOES}
        value=""
        onChange={vi.fn()}
        error="Selecione o estágio da ideia."
      />,
    );

    const erro = screen.getByText('Selecione o estágio da ideia.');
    expect(erro).toHaveAttribute('id', 'estagio-error');

    const radios = screen.getAllByRole('radio');
    for (const r of radios) {
      expect(r.getAttribute('aria-describedby')?.split(' ')).toContain('estagio-error');
    }
  });
});
