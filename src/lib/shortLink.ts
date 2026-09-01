const DEFAULT_BASE_URL = 'https://politica.centraleti.com.br';

export function encodeShortLinkTarget(target: string): string {
  const normalizedTarget = target.startsWith('http')
    ? new URL(target).pathname + new URL(target).search + new URL(target).hash
    : target;

  return Buffer.from(normalizedTarget, 'utf8').toString('base64url').replace(/=+$/g, '');
}

export function decodeShortLinkTarget(slug: string): string {
  if (!slug || /[^A-Za-z0-9_-]/.test(slug)) {
    return '';
  }

  try {
    const padded = `${slug}${'='.repeat((4 - (slug.length % 4)) % 4)}`;
    return Buffer.from(padded, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

export function buildShortLinkUrl(target: string, baseUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_BASE_URL): string {
  const normalizedTarget = target.startsWith('http')
    ? new URL(target).pathname + new URL(target).search + new URL(target).hash
    : target;

  const slug = encodeShortLinkTarget(normalizedTarget);
  return new URL(`/s/${slug}`, baseUrl).toString();
}
