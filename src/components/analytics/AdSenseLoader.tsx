'use client';

import Script from 'next/script';

export default function AdSenseLoader() {
  return (
    <Script
      strategy="lazyOnload"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0388943655208566"
      crossOrigin="anonymous"
    />
  );
}
