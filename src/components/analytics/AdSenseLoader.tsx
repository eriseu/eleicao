'use client';

import { usePathname } from 'next/navigation';

export default function AdSenseLoader() {
  const pathname = usePathname();
  
  // Bloqueia a injeção do AdSense em qualquer rota /embed ou sub-rotas
  const isEmbedRoute = pathname === '/embed' || pathname?.startsWith('/embed/');

  if (isEmbedRoute) {
    return null;
  }

  return (
    <script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0388943655208566"
      crossOrigin="anonymous"
    />
  );
}
