import { Card } from '@/design-system/components/Card';
import { MailIcon } from '@/design-system/icons';

/**
 * Recuperação de senha ainda não tem endpoint no backend (ver Plano 4) — por
 * ora a página só orienta a falar com a coordenação, sem simular um fluxo.
 */
export function RecuperarSenhaForm() {
  return (
    <Card className="w-full overflow-hidden shadow-md">
      <Card.Body className="flex flex-col gap-5 p-7">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-text">Recuperar senha</h1>
        </div>

        <p className="flex items-start gap-2 rounded-[0.625rem] bg-primary-soft px-3 py-3 text-sm font-medium text-primary-text">
          <MailIcon size={16} className="mt-0.5 shrink-0" />
          Para redefinir a senha, fale com a coordenação —
          admin@infohub.dev.
        </p>

        <a
          href="/login"
          className="text-center text-sm text-primary-text hover:underline"
        >
          Voltar ao login
        </a>
      </Card.Body>
    </Card>
  );
}
