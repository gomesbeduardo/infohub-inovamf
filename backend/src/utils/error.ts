export interface HttpError extends Error {
  status: number;
  code: string;
}

// httpError(status, code, message) — erro de domínio que o handler central
// traduz direto para a resposta { error: { code, message } }.
export function httpError(
  status: number,
  code: string,
  message: string,
): HttpError {
  return Object.assign(new Error(message), { status, code }) as HttpError;
}

export function ehHttpError(err: unknown): err is HttpError {
  return (
    err instanceof Error &&
    typeof (err as Partial<HttpError>).status === "number" &&
    typeof (err as Partial<HttpError>).code === "string"
  );
}
