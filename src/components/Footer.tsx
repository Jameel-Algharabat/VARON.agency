import { Link } from "react-router-dom";
import { useBooking } from "../context/booking";
import { useLanguage } from "../context/LanguageProvider";
import { site } from "../content/site";
import { LanguageSwitch } from "./LanguageSwitch";
import { Wordmark } from "./Wordmark";

export function Footer() {
  const { t } = useLanguage();
  const { openBooking } = useBooking();
  const year = new Date().getFullYear();

  const links = [
    { href: "/#work", label: t.nav.work },
    { href: "/#capabilities", label: t.nav.capabilities },
    { href: "/#about", label: t.nav.about },
    { href: "/#contact", label: t.nav.contact },
  ];

  return (
    <footer className="border-t border-rule bg-paper">
      <div className="wrap py-14 md:py-20">
        <div className="grid-12 gap-y-12">
          <div className="col-span-12 md:col-span-6 lg:col-span-5">
            <Link to="/" className="inline-block text-ink" aria-label={site.name}>
              <Wordmark className="text-[18px]" />
            </Link>
            <p className="t-small mt-5 text-mute">{t.footer.tagline}</p>
            <a href={site.url} className="t-small u-line mt-1 inline-block text-ink" dir="ltr">
              {site.domain}
            </a>
          </div>

          <nav className="col-span-6 md:col-span-3 lg:col-span-3 lg:col-start-7" aria-label={t.footer.navLabel}>
            <p className="t-label text-mute">{t.footer.navLabel}</p>
            <ul className="mt-5 flex flex-col gap-3">
              {links.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="t-small u-line text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="col-span-6 md:col-span-3 lg:col-span-3">
            <p className="t-label text-mute">{t.footer.contactLabel}</p>
            <ul className="mt-5 flex flex-col gap-3">
              <li>
                <a href={`mailto:${site.email}`} className="t-small u-line inline-block text-ink" dir="ltr">
                  {site.email}
                </a>
              </li>
              <li>
                <button type="button" onClick={openBooking} className="t-small u-line text-ink">
                  {t.nav.book}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-rule pt-6 md:mt-20 md:flex-row md:items-center md:justify-between">
          <p className="t-caption text-mute">
            <span dir="ltr">© {year} {site.fullName}</span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            {t.footer.rights}
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <span dir="ltr">{t.footer.credit}</span>
          </p>
          <LanguageSwitch />
        </div>
      </div>
    </footer>
  );
}
