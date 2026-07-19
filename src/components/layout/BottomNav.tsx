'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Elo', icon: '🔥' },
  { href: '/duelo', label: 'Duelo', icon: '⚔️' },
  { href: '/ranking', label: 'Ranking', icon: '🏆' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-slate-700 bg-slate-950/95 backdrop-blur-xl z-40">
      <div className="mx-auto flex max-w-lg justify-around px-4 py-3">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold transition ${
                active ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
