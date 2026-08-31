'use client';

import { useEffect } from 'react';

interface AdProps {
  slot: string;
  format?: 'auto' | 'fluid';
}

export default function AdBanner({ slot, format = 'auto' }: AdProps) {
  useEffect(() => {
    try {
      // @ts-expect-error AdSense adiciona adsbygoogle ao objeto window em runtime.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn('AdSense não pôde ser inicializado:', err);
    }
  }, []);

  return (
    <div 
      className="w-full flex justify-center my-4 overflow-hidden bg-slate-50 border border-dashed border-slate-200 rounded-xl" 
      style={{ minHeight: '100px' }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minWidth: '250px', minHeight: '90px' }}
        data-ad-client="ca-pub-0388943655208566"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
