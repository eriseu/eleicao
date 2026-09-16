export const SITE_NAME = 'Duelo Político';
export const SITE_DESCRIPTION =
  'Compare candidatos e acompanhe o ranking político por estado e município.';

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'https://politica.centraleti.com.br';

  const urlWithProtocol = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;

  return urlWithProtocol.replace(/\/$/, '');
}

