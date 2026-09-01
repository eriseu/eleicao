const DEFAULT_BASE_URL = 'https://politica.centraleti.com.br';

/**
 * Função universal de encode para base64url (funciona em Node.js e navegador)
 */
function toBase64Url(str: string): string {
  if (typeof window !== 'undefined') {
    // Navegador: usar btoa
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } else {
    // Node.js: usar Buffer
    return Buffer.from(str, 'utf8').toString('base64url').replace(/=+$/g, '');
  }
}

/**
 * Função universal de decode para base64url (funciona em Node.js e navegador)
 */
function fromBase64Url(slug: string): string {
  if (!slug || /[^A-Za-z0-9_-]/.test(slug)) {
    return '';
  }

  try {
    // Adicionar padding
    const padded = `${slug}${'='.repeat((4 - (slug.length % 4)) % 4)}`;
    
    if (typeof window !== 'undefined') {
      // Navegador: usar atob
      return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    } else {
      // Node.js: usar Buffer
      return Buffer.from(padded, 'base64url').toString('utf8');
    }
  } catch {
    return '';
  }
}

export function encodeShortLinkTarget(target: string): string {
  const normalizedTarget = target.startsWith('http')
    ? new URL(target).pathname + new URL(target).search + new URL(target).hash
    : target;

  return toBase64Url(normalizedTarget);
}

export function decodeShortLinkTarget(slug: string): string {
  return fromBase64Url(slug);
}

export function buildShortLinkUrl(target: string, baseUrl = typeof window !== 'undefined' ? window.location.origin : DEFAULT_BASE_URL): string {
  const normalizedTarget = target.startsWith('http')
    ? new URL(target).pathname + new URL(target).search + new URL(target).hash
    : target;

  const slug = encodeShortLinkTarget(normalizedTarget);
  return new URL(`/s/${slug}`, baseUrl).toString();
}
