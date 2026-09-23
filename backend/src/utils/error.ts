export interface HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
}

// httpError(status, code, message[, details]) — erro de domínio que o handler
// central traduz direto para { error: { code, message, details? } }.
export function httpError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): HttpError {
  return Object.assign(new Error(message), {
    status,
    code,
    ...(details !== undefined ? { details } : {}),
  }) as HttpError;
}

export function ehHttpError(err: unknown): err is HttpError {
  return (
    err instanceof Error &&
    typeof (err as Partial<HttpError>).status === "number" &&
    typeof (err as Partial<HttpError>).code === "string"
  );
}
