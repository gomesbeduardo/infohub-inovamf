/** Erro de domínio da API: { error: { code, message, details? } }. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function lerErro(res: Response): Promise<ApiError> {
  let corpo: { error?: { code?: string; message?: string; details?: unknown } } = {};
  try {
    corpo = await res.json();
  } catch {
    /* resposta sem corpo JSON */
  }
  return new ApiError(
    res.status,
    corpo.error?.code ?? `HTTP_${res.status}`,
    corpo.error?.message ?? 'Não foi possível falar com o servidor. Tente de novo.',
    corpo.error?.details,
  );
}
