import { NextResponse } from 'next/server';

import { decodeShortLinkTarget } from '@/lib/shortLink';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const target = decodeShortLinkTarget(slug);

  if (!target) {
    return NextResponse.redirect(new URL('/', request.url), 308);
  }

  const destination = target.startsWith('http')
    ? new URL(target)
    : new URL(target, new URL(request.url).origin);

  return NextResponse.redirect(destination, 308);
}
