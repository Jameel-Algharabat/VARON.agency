/**
 * VARON wordmark. Uses currentColor so it inverts with the header over dark sections.
 */
const SRC = "/varon-wordmark.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block shrink-0 bg-current ${className}`}
      style={{
        aspectRatio: "868 / 178",
        width: "auto",
        WebkitMaskImage: `url(${SRC})`,
        maskImage: `url(${SRC})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
      aria-hidden="true"
    />
  );
}
