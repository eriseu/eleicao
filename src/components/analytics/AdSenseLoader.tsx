'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

export default function AdSenseLoader() {
  const pathname = usePathname();
  const isEmbedRoute = pathname === '/embed' || pathname.startsWith('/embed/');

  if (isEmbedRoute) {
    return null;
  }

  return (
    <Script
      id="adsense-init"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0388943655208566"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
