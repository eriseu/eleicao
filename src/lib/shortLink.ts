const DEFAULT_BASE_URL = 'https://politica.centraleti.com.br';
const CANONICAL_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_BASE_URL;

function normalizeUuid(value: string): string {
  return value.replace(/-/g, '');
}

function formatUuid(value: string): string {
  const clean = normalizeUuid(value);

  if (clean.length !== 32) {
    return value;
  }

  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
}

function toSlugSegment(value: string): string {
  const encoded = encodeURIComponent(value)
    .replace(/%/g, '')
    .replace(/\./g, '_');

  return encoded || '0';
}

function fromSlugSegment(value: string): string {
  if (!value) return '';

  const restored = value.replace(/_/g, '%');
  try {
    return decodeURIComponent(restored);
  } catch {
    return value;
  }
}

export function encodeShortLinkTarget(target: string): string {
  const normalizedTarget = target.startsWith('http')
    ? new URL(target).pathname + new URL(target).search + new URL(target).hash
    : target;

  const url = new URL(normalizedTarget, CANONICAL_BASE_URL);

  if (url.pathname === '/duelo') {
    const c1 = url.searchParams.get('c1');
    const c2 = url.searchParams.get('c2');

    if (c1 && c2) {
      const uf = url.searchParams.get('uf') || 'BR';
      const municipio = url.searchParams.get('municipio') || '';
      const parts = [normalizeUuid(c1), normalizeUuid(c2), toSlugSegment(uf)];

      if (municipio) parts.push(toSlugSegment(municipio));
      return parts.join('.');
    }
  }

  if (url.pathname === '/ranking') {
    const uf = url.searchParams.get('uf') || 'BR';
    const municipio = url.searchParams.get('municipio') || '';
    const parts = ['r', toSlugSegment(uf)];

    if (municipio) parts.push(toSlugSegment(municipio));
    return parts.join('.');
  }

  return toSlugSegment(normalizedTarget);
}

export function decodeShortLinkTarget(slug: string): string {
  if (!slug) {
    return '';
  }

  const parts = slug.split('.');

  if (parts.length >= 2 && /^[a-f0-9]{32}$/i.test(parts[0]) && /^[a-f0-9]{32}$/i.test(parts[1])) {
    const params = new URLSearchParams();
    const uf = parts[2] ? fromSlugSegment(parts[2]) : 'BR';
    params.set('uf', uf || 'BR');
    params.set('c1', formatUuid(parts[0]));
    params.set('c2', formatUuid(parts[1]));

    if (parts[3]) {
      params.set('municipio', fromSlugSegment(parts[3]));
    }

    return `/duelo?${params.toString()}`;
  }

  if (parts[0] === 'r' && parts.length >= 2) {
    const params = new URLSearchParams();
    params.set('uf', fromSlugSegment(parts[1]) || 'BR');

    if (parts[2]) {
      params.set('municipio', fromSlugSegment(parts[2]));
    }

    return `/ranking?${params.toString()}`;
  }

  try {
    const padded = `${slug}${'='.repeat((4 - (slug.length % 4)) % 4)}`;
    return Buffer.from(padded, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

export function buildShortLinkUrl(target: string, baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : DEFAULT_BASE_URL)): string {
  const normalizedTarget = target.startsWith('http')
    ? new URL(target).pathname + new URL(target).search + new URL(target).hash
    : target;

  const slug = encodeShortLinkTarget(normalizedTarget);
  return new URL(`/s/${slug}`, baseUrl).toString();
}
