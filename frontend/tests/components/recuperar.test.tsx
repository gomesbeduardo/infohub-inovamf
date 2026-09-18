import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { StoreProvider } from '@/data/store';
import { RecuperarSenhaForm } from '@/features/auth/RecuperarSenhaForm';

function renderForm() {
  return render(
    <StoreProvider>
      <RecuperarSenhaForm />
    </StoreProvider>,
  );
}

describe('RecuperarSenhaForm', () => {
  it('envia um código para um e-mail existente', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('E-mail'), 'admin@infohub.dev');
    await user.click(screen.getByRole('button', { name: /enviar código/i }));
    expect(screen.getByText(/enviamos um código/i)).toBeInTheDocument();
  });

  it('mostra erro para e-mail inexistente', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('E-mail'), 'ninguem@infohub.dev');
    await user.click(screen.getByRole('button', { name: /enviar código/i }));
    expect(screen.getByText(/não encontrado/i)).toBeInTheDocument();
  });
});
