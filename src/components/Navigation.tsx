import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useBooking } from "../context/booking";
import { useLanguage } from "../context/LanguageProvider";
import { site } from "../content/site";
import { Arrow } from "./Arrow";
import { LanguageSwitch } from "./LanguageSwitch";
import { EASE } from "../motion";
import { Logo } from "./Logo";

const NAV_IDS = ["work", "capabilities", "about", "contact"] as const;

export function Navigation() {
  const { t } = useLanguage();
  const { openBooking } = useBooking();
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Flip the header to light-on-dark while its band overlaps a dark section.
  useEffect(() => {
    const darks = Array.from(document.querySelectorAll<HTMLElement>("[data-dark]"));
    let frame = 0;
    const check = () => {
      frame = 0;
      const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h"), 10) || 64;
      const band = headerH / 2;
      setDark(
        darks.some((el) => {
          const r = el.getBoundingClientRect();
          return r.top <= band && r.bottom >= band;
        }),
      );
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    schedule();
    if (!darks.length) return () => window.cancelAnimationFrame(frame);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  useEffect(() => {
    const nodes = NAV_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (!nodes.length) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActive(NAV_IDS.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.2, 0.5] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  const onHome = pathname === "/";
  const links = [
    { id: "work", label: t.nav.work, n: "01" },
    { id: "capabilities", label: t.nav.capabilities, n: "02" },
    { id: "about", label: t.nav.about, n: "03" },
    { id: "contact", label: t.nav.contact, n: "04" },
  ];

  const isActive = (id: string) => onHome && active === id;
  const onDark = dark && !open;

  const headerSurface = open
    ? "bg-paper"
    : onDark
      ? "border-b border-paper/10 bg-ink/85 backdrop-blur-md"
      : scrolled
        ? "border-b border-rule bg-paper/85 backdrop-blur-md"
        : "border-b border-transparent bg-transparent";

  const fg = onDark ? "text-paper" : "text-ink";
  const navOff = onDark ? "text-paper/55 hover:text-paper" : "text-mute hover:text-ink";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,color,backdrop-filter] duration-300 ${headerSurface}`}
      >
        <div className="wrap relative flex h-[var(--header-h)] items-center justify-between gap-6">
          <Link
            to="/"
            className={`${fg} relative z-10 -ms-1 flex items-center gap-2 p-1 transition-opacity duration-200 hover:opacity-70`}
            onClick={() => setOpen(false)}
            aria-label={site.name}
          >
            <Logo className="h-6 w-auto" />
          </Link>

          <nav
            className="pointer-events-none absolute inset-x-0 hidden justify-center lg:flex"
            aria-label={t.footer.navLabel}
          >
            <div className="pointer-events-auto flex items-center gap-8">
              {links.map((link) => (
                <NavAnchor
                  key={link.id}
                  id={link.id}
                  pathname={pathname}
                  className={`t-nav u-line transition-colors duration-200 ${isActive(link.id) ? fg : navOff}`}
                  dataActive={isActive(link.id)}
                >
                  {link.label}
                </NavAnchor>
              ))}
            </div>
          </nav>

          <div className="relative z-10 flex items-center gap-5 lg:gap-7">
            <LanguageSwitch inverse={onDark} />
            <button
              type="button"
              onClick={openBooking}
              aria-label={t.contact.bookAria}
              className={`btn hidden !min-h-10 !px-4 !text-[13px] lg:inline-flex ${onDark ? "btn-inverse" : "btn-primary"}`}
            >
              {t.nav.book}
            </button>
            <button
              type="button"
              className={`t-nav flex items-center gap-2 lg:hidden ${fg}`}
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span>{open ? t.nav.close : t.nav.menu}</span>
              <span className="relative block size-4" aria-hidden="true">
                <span
                  className={`absolute inset-x-0 top-[5px] h-px bg-current transition-transform duration-300 ${open ? "translate-y-[2.5px] rotate-45" : ""}`}
                />
                <span
                  className={`absolute inset-x-0 top-[10px] h-px bg-current transition-transform duration-300 ${open ? "-translate-y-[2.5px] -rotate-45" : ""}`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="site-menu"
            className="fixed inset-0 z-40 flex flex-col bg-paper lg:hidden"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="wrap flex h-dvh flex-col overflow-y-auto pt-[calc(var(--header-h)+24px)] pb-8">
              <nav className="flex flex-col" aria-label={t.nav.menu}>
                {links.map((link, i) => (
                  <motion.div
                    key={link.id}
                    className="border-b border-rule"
                    initial={reduce ? false : { y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.08 + i * 0.06, duration: 0.5, ease: EASE }}
                  >
                    <NavAnchor
                      id={link.id}
                      pathname={pathname}
                      onClick={() => setOpen(false)}
                      className="group flex items-baseline justify-between gap-6 py-5"
                    >
                      <span className={`t-h2 ${isActive(link.id) ? "text-ink" : "text-graphite"}`}>{link.label}</span>
                      <span className="t-label t-num text-mute">{link.n}</span>
                    </NavAnchor>
                  </motion.div>
                ))}
              </nav>

              <motion.div
                className="mt-auto flex flex-col gap-6"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.36, duration: 0.5, ease: EASE }}
              >
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  aria-label={t.contact.bookAria}
                  onClick={() => {
                    setOpen(false);
                    openBooking();
                  }}
                >
                  <span>{t.hero.primary}</span>
                  <Arrow />
                </button>
                <div className="flex items-center justify-between gap-4">
                  <a href={`mailto:${site.email}`} className="t-small text-mute hover:text-ink" dir="ltr">
                    {site.email}
                  </a>
                  <LanguageSwitch />
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function NavAnchor({
  id,
  pathname,
  children,
  className,
  onClick,
  dataActive,
}: {
  id: string;
  pathname: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  dataActive?: boolean;
}) {
  const props = {
    className,
    onClick,
    "data-active": dataActive ? "true" : undefined,
    "aria-current": dataActive ? ("true" as const) : undefined,
  };

  if (pathname === "/") {
    return (
      <a href={`#${id}`} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link to={`/#${id}`} {...props}>
      {children}
    </Link>
  );
}
