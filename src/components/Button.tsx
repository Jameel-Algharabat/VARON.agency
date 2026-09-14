import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Arrow } from "./Arrow";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  arrow?: boolean;
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
};

export function Button({
  children,
  href,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  disabled,
  ariaLabel,
  arrow = false,
}: ButtonProps) {
  const classes = `group ${variants[variant]} ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      {arrow ? <Arrow className="arrow-shift" /> : null}
    </>
  );

  if (href) {
    if (href.startsWith("#")) {
      return (
        <a href={href} className={classes} onClick={onClick} aria-label={ariaLabel}>
          {inner}
        </a>
      );
    }
    if (href.startsWith("http") || href.startsWith("mailto:")) {
      const external = href.startsWith("http");
      return (
        <a
          href={href}
          className={classes}
          onClick={onClick}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          aria-label={ariaLabel}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link to={href} className={classes} onClick={onClick} aria-label={ariaLabel}>
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {inner}
    </button>
  );
}

export function TextLink({
  href,
  children,
  className = "",
  external,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
  ariaLabel?: string;
}) {
  const isExternal = external ?? href.startsWith("http");
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      aria-label={ariaLabel}
      className={`group inline-flex items-center gap-2 t-nav text-ink ${className}`}
    >
      <span className="u-line">{children}</span>
      <Arrow className="arrow-shift" direction={isExternal ? "external" : "forward"} />
    </a>
  );
}
