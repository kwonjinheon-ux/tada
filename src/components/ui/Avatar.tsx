import { getAvatarFallback } from "@/lib/avatar-fallback";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  alt?: string;
  className?: string;
  initials?: "single" | "double";
  colored?: boolean;
};

function getInitials(name: string | null | undefined, mode: "single" | "double") {
  const label = name?.trim() || "Tada User";
  if (mode === "double") {
    return label.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T";
  }
  return label.charAt(0).toUpperCase() || "T";
}

export function Avatar({ src, name, alt = "", className, initials = "single", colored = false }: AvatarProps) {
  if (src) {
    return <img className={className} src={src} alt={alt} />;
  }
  const style = colored ? { backgroundColor: getAvatarFallback(name).color } : undefined;
  return (
    <span className={className} style={style}>
      {getInitials(name, initials)}
    </span>
  );
}
