'use client';

import { useEffect } from 'react';

interface AdProps {
  slot: string;
  format?: 'auto' | 'fluid';
}

export default function AdBanner({ slot, format = 'auto' }: AdProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      // Silencia erros se o adblock estiver ativo ou o script ainda não carregou
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
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}