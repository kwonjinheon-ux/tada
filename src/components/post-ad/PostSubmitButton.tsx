import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type PostSubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  progress?: number;
  isProgressing?: boolean;
};

export function PostSubmitButton({ children, className, progress = 0, isProgressing = false, ...props }: PostSubmitButtonProps) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));
  return <button
    {...props}
    className={["post-submit-button", isProgressing ? "is-progress" : "", className].filter(Boolean).join(" ")}
    aria-busy={isProgressing || undefined}
    aria-valuemin={isProgressing ? 0 : undefined}
    aria-valuemax={isProgressing ? 100 : undefined}
    aria-valuenow={isProgressing ? normalizedProgress : undefined}
    role={isProgressing ? "progressbar" : undefined}
    style={{ "--post-submit-progress": `${normalizedProgress}%` } as CSSProperties}
  ><span>{children}</span></button>;
}
