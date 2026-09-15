import { useLanguage } from "../../context/LanguageProvider";
import { site } from "../../content/site";
import { Arrow } from "../Arrow";
import { CtaGroup } from "../CtaGroup";
import { Lines, Reveal } from "../Reveal";

export function Contact() {
  const { t } = useLanguage();

  return (
    <section id="contact" className="bg-paper py-28 md:py-44" aria-label={t.contact.label}>
      <div className="wrap">
        <div className="grid-12 border-t border-rule pt-6 md:pt-8">
          <Reveal className="col-span-12 md:col-span-3">
            <p className="t-label t-num text-mute">
              <span dir="ltr">{t.contact.index}</span>
              <span className="mx-2" aria-hidden="true">
                —
              </span>
              {t.contact.label}
            </p>
          </Reveal>

          <div className="col-span-12 mt-8 md:col-span-9 md:mt-0">
            <h2>
              <Lines text={t.contact.title} className="t-display block max-w-[16ch] text-ink rtl:max-w-[18ch]" stagger={0.1} />
            </h2>
            <Reveal delay={0.16}>
              <p className="t-lead mt-8 max-w-[42ch] text-mute md:mt-10">{t.contact.lead}</p>
            </Reveal>
            <Reveal delay={0.22} className="cta-group-wrap mt-10 flex flex-col items-start gap-5 lg:flex-row lg:items-center md:mt-12">
              <CtaGroup bookLabel={t.contact.book} />
              <a href={`mailto:${site.email}`} className="group inline-flex items-center gap-2 t-nav text-ink">
                <span className="text-mute">{t.contact.emailLabel}</span>
                <span className="u-line" dir="ltr">
                  {site.email}
                </span>
                <Arrow className="arrow-shift" />
              </a>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
