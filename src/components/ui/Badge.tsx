interface Props {
  children: React.ReactNode;
}

export default function Badge({ children }: Props) {
  return (
    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
      {children}
    </span>
  );
}
