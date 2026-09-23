import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/candidato/', '/api/og', '/api/candidatos', '/api/ranking'],
      disallow: ['/api/', '/admin', '/admin/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

