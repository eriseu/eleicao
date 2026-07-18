import React, { Suspense } from 'react';
import DueloClient from './DueloClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando duelo...</div>}>
      <DueloClient />
    </Suspense>
  );
}
