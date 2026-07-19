"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  // Função auxiliar para aplicar estilos dinâmicos ao link ativo
  const linkStyle = (path: string) => {
    const baseStyle = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200";
    return pathname === path
      ? `${baseStyle} bg-emerald-600 text-slate-950`
      : `${baseStyle} text-slate-300 hover:bg-slate-800 hover:text-white`;
  };

  return (
    <nav className="w-full bg-slate-950/95 shadow-sm border-b border-slate-800 sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Título */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-emerald-600 tracking-tight">
              ⚡ Tinder Político
            </Link>
          </div>

          {/* Links de Navegação */}
          <div className="flex space-x-2">
            <Link href="/" className={linkStyle("/")}>
              🔥 Elo
            </Link>
            <Link href="/duelo" className={linkStyle("/duelo")}>
              ⚔️ Duelo
            </Link>
            <Link href="/ranking" className={linkStyle("/ranking")}>
              📊 Ranking
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
