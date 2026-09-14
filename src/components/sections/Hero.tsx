import { motion, useReducedMotion } from "framer-motion";
import { useBooking } from "../../context/booking";
import { useLanguage } from "../../context/LanguageProvider";
import { Arrow } from "../Arrow";
import { ParticleLogo } from "../ParticleLogo";
import { Button } from "../Button";
import { EASE } from "../../motion";
import { ClipReveal, Lines } from "../Reveal";

export function Hero() {
  const { t } = useLanguage();
  const { openBooking } = useBooking();
  const reduce = useReducedMotion();

  const fade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.6, ease: EASE },
  });

  return (
    <section id="top" className="relative bg-paper pt-[calc(var(--header-h)+40px)] md:pt-[calc(var(--header-h)+64px)]">
      <div className="wrap">
        <div className="grid-12 items-start gap-y-10">
          <div className="col-span-12 sm:col-span-6 lg:col-span-7 lg:row-start-1">
            <ClipReveal delay={0.05}>
              <p className="t-label flex items-center gap-3 text-mute">
                <span className="size-1.5 bg-ink" aria-hidden="true" />
                {t.hero.kicker}
              </p>
            </ClipReveal>

            <h1 className="mt-8 md:mt-10">
              <Lines text={t.hero.title} className="t-display block max-w-[13ch] text-ink rtl:max-w-[16ch]" delay={0.12} stagger={0.1} />
            </h1>
          </div>

          <motion.div
            className="col-span-12 flex w-full min-w-0 justify-center self-start sm:col-span-6 sm:col-start-7 sm:row-start-1 sm:mt-4 sm:justify-start md:mt-5 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:mt-2"
            {...fade(0.5)}
          >
            <div className="aspect-[5/4] w-full shrink-0 overflow-hidden sm:aspect-auto">
              <ParticleLogo className="w-full" label={t.hero.artifactLabel} />
            </div>
          </motion.div>
        </div>

        <div className="grid-12 mt-12 items-start gap-y-8 md:mt-16">
          <motion.p className="t-lead col-span-12 max-w-[44ch] text-graphite md:col-span-7 lg:col-span-5" {...fade(0.4)}>
            {t.hero.lead}
          </motion.p>

          <motion.div
            className="col-span-12 flex flex-col items-start gap-3 sm:flex-row sm:items-center md:col-span-5 md:justify-end lg:col-span-6 lg:col-start-7"
            {...fade(0.5)}
          >
            <Button onClick={openBooking} ariaLabel={t.contact.bookAria} arrow className="w-full sm:w-auto">
              {t.hero.primary}
            </Button>
            <Button href="#work" variant="secondary" arrow className="w-full sm:w-auto">
              {t.hero.secondary}
            </Button>
          </motion.div>
        </div>

        <motion.div
          className="mt-16 flex items-center justify-between gap-6 border-t border-rule pt-5 md:mt-24"
          {...fade(0.7)}
        >
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label={t.hero.rolesLabel}>
            {t.hero.roles.map((role) => (
              <li key={role} className="t-label text-mute">
                {role}
              </li>
            ))}
          </ul>
          <a href="#work" className="group t-label hidden items-center gap-2 text-mute transition-colors hover:text-ink sm:inline-flex">
            {t.scroll}
            <Arrow direction="down" className="transition-transform duration-300 group-hover:translate-y-0.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
