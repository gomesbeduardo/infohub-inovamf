import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Como a sessão é mockada no cliente (sessionStorage), o middleware não
 * consegue ler o usuário logado. Ele apenas garante o redirecionamento da raiz
 * para /login; a checagem fina de acesso fica nos layouts de /admin e /aluno.
 */
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
