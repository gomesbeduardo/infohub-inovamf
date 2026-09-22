import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopiarLink } from '@/design-system/components/CopiarLink';

const URL_CONVITE = 'http://infohub.local/convite?token=abc123';

function definirClipboard(valor: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value: valor, configurable: true });
}

describe('CopiarLink', () => {
  it('mostra o link num campo só-leitura e copia pela Clipboard API ("Copiado!")', async () => {
    const user = userEvent.setup();
    // depois do setup(): o userEvent instala o próprio clipboard fake
    const escrever = vi.fn().mockResolvedValue(undefined);
    definirClipboard({ writeText: escrever });

    render(<CopiarLink url={URL_CONVITE} />);
    const campo = screen.getByLabelText('Link de convite');
    expect(campo).toHaveValue(URL_CONVITE);
    expect(campo).toHaveAttribute('readonly');

    await user.click(screen.getByRole('button', { name: /^copiar$/i }));
    expect(escrever).toHaveBeenCalledWith(URL_CONVITE);
    expect(screen.getByRole('button', { name: /copiado!/i })).toBeInTheDocument();
    expect(screen.queryByText(/não foi possível copiar/i)).not.toBeInTheDocument();
  });

  it('sem Clipboard API (HTTP puro): seleciona o texto e pede cópia manual', async () => {
    const user = userEvent.setup();
    definirClipboard(undefined);

    render(<CopiarLink url={URL_CONVITE} />);
    await user.click(screen.getByRole('button', { name: /^copiar$/i }));

    expect(
      screen.getByText('Não foi possível copiar automaticamente — selecione e copie o link.'),
    ).toBeInTheDocument();
    const campo = screen.getByLabelText('Link de convite') as HTMLInputElement;
    expect(document.activeElement).toBe(campo);
    expect(campo.selectionStart).toBe(0);
    expect(campo.selectionEnd).toBe(URL_CONVITE.length);
    expect(screen.queryByText(/copiado!/i)).not.toBeInTheDocument();
  });

  it('se writeText falhar, também cai no modo manual', async () => {
    const user = userEvent.setup();
    definirClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) });

    render(<CopiarLink url={URL_CONVITE} />);
    await user.click(screen.getByRole('button', { name: /^copiar$/i }));
    expect(screen.getByText(/selecione e copie o link/i)).toBeInTheDocument();
  });
});
