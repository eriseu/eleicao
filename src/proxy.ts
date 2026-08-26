import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function unauthorized() {
  return new NextResponse('Autenticacao administrativa necessaria.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Administracao"',
    },
  });
}

export function proxy(request: NextRequest) {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return new NextResponse('Acesso administrativo indisponivel.', { status: 503 });
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Basic ')) {
    return unauthorized();
  }

  try {
    const encodedCredentials = authorization.slice('Basic '.length);
    const credentials = atob(encodedCredentials);
    const separatorIndex = credentials.indexOf(':');
    const username = separatorIndex >= 0 ? credentials.slice(0, separatorIndex) : '';
    const password = separatorIndex >= 0 ? credentials.slice(separatorIndex + 1) : '';

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return unauthorized();
    }
  } catch {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
