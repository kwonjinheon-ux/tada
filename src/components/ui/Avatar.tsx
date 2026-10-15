import { getAvatarFallback } from "@/lib/avatar-fallback";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  alt?: string;
  className?: string;
  initials?: "single" | "double";
  /** An anonymous author has no face to show and no initial worth showing:
   *  the name is the word "Anonymous", so every such avatar would read "A". */
  anonymous?: boolean;
  colored?: boolean;
};

function getInitials(name: string | null | undefined, mode: "single" | "double") {
  const label = name?.trim() || "Tada User";
  if (mode === "double") {
    return label.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T";
  }
  return label.charAt(0).toUpperCase() || "T";
}

export function Avatar({ src, name, alt = "", className, initials = "single", colored = false, anonymous = false }: AvatarProps) {
  if (anonymous) {
    return (
      <span className={className}>
        <i className="ms ms-close avatar-anonymous-mark" aria-hidden="true" />
      </span>
    );
  }
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
