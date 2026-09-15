import { useBooking } from "../context/booking";
import { useLanguage } from "../context/LanguageProvider";
import { site } from "../content/site";
import { Button } from "./Button";

export function CtaGroup({
  bookLabel,
  className = "",
  stacked = false,
  onNavigate,
}: {
  bookLabel: string;
  className?: string;
  stacked?: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useLanguage();
  const { openBooking } = useBooking();

  return (
    <div className={`cta-group${stacked ? " cta-group--stack" : ""} ${className}`.trim()}>
      <Button
        onClick={() => {
          onNavigate?.();
          openBooking();
        }}
        ariaLabel={t.contact.bookAria}
        arrow
      >
        {bookLabel}
      </Button>
      <Button
        href={site.conversationUrl}
        variant="secondary"
        arrow
        ariaLabel={t.contact.conversationAria}
        onClick={onNavigate}
      >
        {t.contact.conversation}
      </Button>
    </div>
  );
}
