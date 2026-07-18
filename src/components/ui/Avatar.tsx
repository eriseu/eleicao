interface Props {
  src: string;
  alt: string;
}

export default function Avatar({ src, alt }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      className="h-12 w-12 rounded-full object-cover"
    />
  );
}
