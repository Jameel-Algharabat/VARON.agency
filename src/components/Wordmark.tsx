import { site } from "../content/site";
import { Logo } from "./Logo";

/**
 * VARON wordmark. Latin, always LTR.
 * The brand mark sits at cap-height before the name.
 */
export function Wordmark({ className = "", mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`} dir="ltr" aria-label={site.name}>
      {mark ? <Logo className="h-[1em] w-auto" /> : null}
    </span>
  );
}
