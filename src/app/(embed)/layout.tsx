import type { Metadata } from 'next';

// Metadata específica para a página de embed, se necessário.
export const metadata: Metadata = {
  title: 'Placar Eleitoral - Embed',
  robots: {
    index: false, // Impede que os motores de busca indexem a página de embed diretamente
    follow: false,
  },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  // Este é um layout minimalista. Ele renderiza APENAS o conteúdo da página (`children`),
  // sem herdar as tags <html>, <body> ou qualquer componente do layout principal (RootLayout).
  return <>{children}</>;
}