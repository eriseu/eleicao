interface Props {
  value: number;
}

export default function Progress({ value }: Props) {
  return (
    <div className="h-2 w-full rounded bg-gray-200">
      <div
        className="h-2 rounded bg-blue-600"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
