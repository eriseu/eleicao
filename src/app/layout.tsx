import "./globals.css";
import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
