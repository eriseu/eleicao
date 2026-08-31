import type { NextRequest } from 'next/server';
import { proxy } from './proxy';

export function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
