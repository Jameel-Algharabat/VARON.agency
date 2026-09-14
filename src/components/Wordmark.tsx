import { site } from "../content/site";
import { Logo } from "./Logo";

/** VARON wordmark. Latin, always LTR. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`} dir="ltr" aria-label={site.name}>
      <Logo className="h-[1em] w-auto" />
    </span>
  );
}
