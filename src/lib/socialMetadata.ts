import type { Metadata } from 'next';
import { getSiteUrl } from './seo';

export function socialMetadata(title: string, description: string, path: string, imagePath: string): Metadata {
  const url = new URL(path, getSiteUrl()).toString();
  const image = new URL(imagePath, getSiteUrl()).toString();
  return {
    title, description, alternates: { canonical: url },
    openGraph: {
      title, description, url, siteName: 'Duelo Político', locale: 'pt_BR', type: 'website',
      images: [{ url: image, width: 1200, height: 630, type: 'image/png', alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
