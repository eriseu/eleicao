import "./globals.css";
import type { Metadata } from "next";
import BottomNav from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: "Tinder Político",
  description: "Descubra quais candidatos combinam com você.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
