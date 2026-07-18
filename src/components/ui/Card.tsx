import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function Card({ children }: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}
