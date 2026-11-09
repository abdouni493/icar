import React, { useRef, useState } from 'react';
import { Language, Agency, Car, SpecialOffer } from '../../types';
import { motion, useScroll, useTransform } from 'motion/react';
import { Shield, Zap, Star, ArrowRight, Car as CarIcon, MapPin, CalendarDays, Search } from 'lucide-react';
import { ShowcaseBand } from './ShowcaseBand';
import { OffersListing } from './OffersListing';
import { ErrorBoundary } from '../ErrorBoundary';
import { WizardSearchCriteria } from './wizard/WizardContext';
import { toYmd } from './wizard/wizardUi';

// ─── Colour tokens for this page ───────────────────────────────────────────
const C = {
  accent:    '#D4AF37',
  amber:     '#C8A13C',
  accentDim: 'rgba(200, 161, 60, 0.14)',
  amberDim:  'rgba(200, 161, 60, 0.10)',
  bg:        '#0A0A08',
  surface:   '#121109',
};

// ─── Pure CSS + Framer Motion hero visual (anneaux animés uniquement) ────────
function HeroVisual() {
  return (
    <div className="relative w-full h-[500px] flex items-center justify-center">

      {/* Outer slow rotating ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{ border: '1px solid rgba(200, 161, 60,0.09)' }}
      >
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
          style={{ background: C.accent, boxShadow: `0 0 14px ${C.accent}` }} />
      </motion.div>

      {/* Middle violet counter-ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute w-[290px] h-[290px] rounded-full"
        style={{ border: '1px dashed rgba(200, 161, 60,0.2)' }}
      >
        <div className="absolute top-0 right-6 w-2 h-2 rounded-full"
          style={{ background: C.amber, boxShadow: `0 0 10px ${C.amber}` }} />
      </motion.div>

      {/* Inner pulsing ring */}
      <motion.div
        animate={{ scale: [1, 1.07, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute w-[180px] h-[180px] rounded-full"
        style={{ border: '1px solid rgba(200, 161, 60,0.3)' }}
      />

      {/* Corner accent dots */}
      <div className="absolute top-8 left-8 w-1.5 h-1.5 rounded-full opacity-60"
        style={{ background: C.amber }} />
      <div className="absolute bottom-12 left-12 w-1 h-1 rounded-full opacity-40"
        style={{ background: C.accent }} />
      <div className="absolute top-16 right-16 w-1 h-1 rounded-full opacity-50"
        style={{ background: C.accent }} />
    </div>
  );
}

// ─── Widget de réservation du hero (agences + période → voitures dispo) ─────
function BookingSearchPanel({ lang, agencies, onSearch, hasBg }: {
  lang: Language;
  agencies: Agency[];
  onSearch: (criteria: WizardSearchCriteria) => void;
  hasBg?: boolean;
}) {
  const today = toYmd(new Date());
  const [departureAgencyId, setDepartureAgencyId] = useState('');
  const [returnAgencyId, setReturnAgencyId] = useState('');   // '' = même agence
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const isValid = !!departureAgencyId && !!from && !!to && from <= to && from >= today;

  const selectClass = "w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200 cursor-pointer wiz-field";
  const inputClass = "w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200 wiz-field";

  const fields: { label: string; icon: React.ReactNode; el: React.ReactNode }[] = [
    {
      label: { fr: 'Lieu de départ', ar: 'مكان المغادرة' }[lang],
      icon: <MapPin size={13} className="text-red-500" />,
      el: (
        <select value={departureAgencyId} onChange={e => setDepartureAgencyId(e.target.value)}
          className={selectClass}>
          <option value="">{{ fr: 'Sélectionner…', ar: 'اختر…' }[lang]}</option>
          {agencies.map(a => <option key={a.id} value={a.id}>{a.name} — {a.city}</option>)}
        </select>
      ),
    },
    {
      label: { fr: 'Lieu de retour', ar: 'مكان الإرجاع' }[lang],
      icon: <MapPin size={13} className="text-red-500" />,
      el: (
        <select value={returnAgencyId} onChange={e => setReturnAgencyId(e.target.value)}
          className={selectClass}>
          <option value="">{{ fr: 'Même lieu', ar: 'نفس المكان' }[lang]}</option>
          {agencies.map(a => <option key={a.id} value={a.id}>{a.name} — {a.city}</option>)}
        </select>
      ),
    },
    {
      label: { fr: 'Date de départ', ar: 'تاريخ البدء' }[lang],
      icon: <CalendarDays size={13} className="text-red-500" />,
      el: (
        <input type="date" value={from} min={today}
          onChange={e => { setFrom(e.target.value); if (to && e.target.value > to) setTo(''); }}
          className={inputClass} />
      ),
    },
    {
      label: { fr: 'Date de retour', ar: 'تاريخ الإرجاع' }[lang],
      icon: <CalendarDays size={13} className="text-red-500" />,
      el: (
        <input type="date" value={to} min={from || today}
          onChange={e => setTo(e.target.value)}
          className={inputClass} />
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.75 }}
      className="relative z-20 rounded-3xl p-6 sm:p-8"
      style={{
        background: 'rgba(18, 17, 9, 0.72)',
        border: '1px solid rgba(200, 161, 60, 0.30)',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
        boxShadow: '0 30px 80px rgba(0,0,0, 0.55), inset 0 1px 0 rgba(200, 161, 60, 0.18)',
      }}
    >
      <p className="text-xs font-bold tracking-[0.2em] uppercase mb-5 flex items-center gap-2"
        style={{ color: C.accent, fontFamily: 'var(--font-display)' }}>
        <Search size={14} className="animate-pulse" />
        {{ fr: 'Trouvez votre voiture disponible', ar: 'اعثر على سيارتك المتاحة' }[lang]}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-end">
        {fields.map((f, i) => (
          <div key={i}>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2"
              style={{ fontFamily: 'var(--font-display)' }}>
              {f.icon} {f.label}
            </label>
            {f.el}
          </div>
        ))}

        <motion.button
          onClick={() => isValid && onSearch({
            from, to,
            departureAgencyId,
            returnAgencyId: returnAgencyId || undefined,
          })}
          disabled={!isValid}
          whileHover={isValid ? { scale: 1.03, y: -1 } : {}}
          whileTap={isValid ? { scale: 0.97 } : {}}
          className={`px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-all ${!isValid ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
          style={{
            fontFamily: 'var(--font-display)',
            background: `linear-gradient(135deg, #E4C878, #B8912E)`,
            color: '#14130E',
            boxShadow: isValid ? '0 6px 24px rgba(200, 161, 60, 0.45)' : 'none',
          }}
        >
          {{ fr: 'Suivant', ar: 'التالي' }[lang]} <ArrowRight size={16} />
        </motion.button>
      </div>

      <p className="text-slate-400 text-[11px] mt-4 font-medium">
        {{ fr: 'Nous afficherons uniquement les voitures disponibles sur la période choisie.',
           ar: 'سنعرض فقط السيارات المتاحة في الفترة المختارة.' }[lang]}
      </p>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
interface WelcomeProps {
  lang: Language;
  websiteSettings: any;
  /** Agences pour le widget de recherche de disponibilité. */
  agencies: Agency[];
  /** Toutes les voitures disponibles (affichées directement sous la carte de réservation). */
  cars: Car[];
  /** Offres spéciales (badges de remise sur les cartes). */
  specialOffers: SpecialOffer[];
  /** Lance le wizard avec une voiture présélectionnée. */
  onOrderCar: (car: Car) => void;
  /** Ouvre la grille des voitures ("Voir les voitures"). */
  onStartRenting: () => void;
  /** Lance le wizard de réservation ("Réserver"). */
  onReserve: () => void;
  /** Recherche de disponibilité : ouvre le wizard pré-rempli (agences + dates). */
  onSearch: (criteria: WizardSearchCriteria) => void;
  /** Photo d'une voiture de la flotte pour la bande vitrine. */
  showcaseImage?: string;
}

export const Welcome: React.FC<WelcomeProps> = ({ lang, websiteSettings, agencies, cars, specialOffers, onOrderCar, onStartRenting, onReserve, onSearch, showcaseImage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.4], [0, -80]);

  const hasBg = !!websiteSettings?.landing_background;

  const features = [
    {
      icon: Shield,
      title: { fr: 'Assurance incluse', ar: 'التأمين مشمول' },
      desc:  { fr: 'Tous nos véhicules sont assurés et couverts', ar: 'جميع سياراتنا مؤمنة ومغطاة' },
    },
    {
      icon: Zap,
      title: { fr: 'Réservation rapide', ar: 'حجز سريع' },
      desc:  { fr: 'En 3 étapes simples, réservez votre véhicule', ar: 'في 3 خطوات بسيطة احجز سيارتك' },
    },
    {
      icon: Star,
      title: { fr: 'Flotte premium', ar: 'أسطول فاخر' },
      desc:  { fr: 'Véhicules récents, propres et bien entretenus', ar: 'سيارات حديثة ونظيفة وجيدة الصيانة' },
    },
  ];

  return (
    <div ref={containerRef} className="relative overflow-hidden" style={{ background: C.bg }}>

      {/* ══ HERO SECTION ══ */}
      <section className="relative flex items-start">

        {/* Background image — subtle blur + cinematic dark overlay for readability */}
        {websiteSettings?.landing_background && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <motion.img
              src={websiteSettings.landing_background}
              alt=""
              className="w-full h-full object-cover"
              style={{ transform: 'scale(1.05)' }}
              animate={{ scale: [1.05, 1.10, 1.05] }}
              transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
              referrerPolicy="no-referrer"
            />
            {/* Multi-layer overlay: dark bottom for readability, lighter top to show image */}
            <div className="absolute inset-0" style={{
              background: `linear-gradient(180deg,
                rgba(15,23,42,0.3) 0%,
                rgba(15,23,42,0.2) 30%,
                rgba(15,23,42,0.35) 60%,
                rgba(15,23,42,0.7) 100%)`,
            }} />
            {/* Left-side text protection gradient */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(90deg, rgba(15,23,42,0.5) 0%, rgba(245,240,225,0.1) 55%, transparent 100%)',
            }} />
          </div>
        )}

        {/* Fine diagonal grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `linear-gradient(${C.accent} 1px, transparent 1px), linear-gradient(90deg, ${C.accent} 1px, transparent 1px)`,
          backgroundSize: '70px 70px',
        }} />

        {/* Cyan top glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 75% 55% at 60% -10%, ${C.accentDim}, transparent)`,
        }} />

        {/* Violet bottom-left blob */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] pointer-events-none" style={{
          background: `radial-gradient(circle, ${C.amberDim}, transparent 70%)`,
          transform: 'translate(-30%, 30%)',
        }} />

        {/* Horizontal accent line */}
        <div className="absolute top-[48%] left-0 right-0 h-px pointer-events-none" style={{
          background: `linear-gradient(90deg, transparent, ${C.accent}22, ${C.amber}33, transparent)`,
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col items-center pt-24 pb-24">

            {/* ── Titre héro façon VÖLZ : grand, serré, accroche dorée ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-center max-w-4xl mb-10"
            >
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.6 }}
                className="inline-flex items-center gap-2 volz-pill px-4 py-1.5 mb-6"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: C.accent, boxShadow: `0 0 10px ${C.accent}` }} />
                <span className="volz-eyebrow" style={{ letterSpacing: '0.18em', color: '#F5EBCD' }}>
                  {{ fr: 'Location de voitures · Algérie', ar: 'تأجير السيارات · الجزائر' }[lang]}
                </span>
              </motion.span>

              <h1 className="volz-h1 text-vel-ink">
                {{ fr: 'Cherchez mieux.', ar: 'ابحث بذكاء.' }[lang]}{' '}
                <span className="gold-text gold-text-anim">
                  {{ fr: 'Roulez en minutes.', ar: 'انطلق في دقائق.' }[lang]}
                </span>
              </h1>

              <p className="text-vel-slate text-base sm:text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
                {{
                  fr: "Comparez toute notre flotte, réservez votre véhicule et payez à votre façon — en quelques minutes.",
                  ar: 'قارن بين كل سياراتنا، احجز سيارتك وادفع بالطريقة التي تناسبك — في دقائق معدودة.',
                }[lang]}
              </p>
            </motion.div>

            {/* ── Carte de réservation : centrée en haut de la page ── */}
            <div className="w-full max-w-5xl">
              <BookingSearchPanel lang={lang} agencies={agencies} onSearch={onSearch} hasBg={hasBg} />
            </div>

            {/* ── Trio de cartes « atouts » façon VÖLZ ── */}
            <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {[
                {
                  title: { fr: 'Toute la flotte, une recherche', ar: 'كل الأسطول، بحث واحد' },
                  desc:  { fr: 'Citadines, SUV & premium, au même endroit.', ar: 'سيارات صغيرة، دفع رباعي وفاخرة، في مكان واحد.' },
                  icon: CarIcon,
                },
                {
                  title: { fr: 'Réservation en minutes', ar: 'حجز في دقائق' },
                  desc:  { fr: 'Trois étapes simples, clés en main le jour même.', ar: 'ثلاث خطوات بسيطة، ومفاتيحك في نفس اليوم.' },
                  icon: Zap,
                },
                {
                  title: { fr: 'Payez à votre façon', ar: 'ادفع بطريقتك' },
                  desc:  { fr: 'Espèces, CIB, BaridiMob, Visa & Mastercard.', ar: 'نقداً، CIB، بريدي موب، Visa و Mastercard.' },
                  icon: Shield,
                },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="volz-feature p-5 text-left"
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: `${C.accent}16`, border: `1px solid ${C.accent}3a` }}>
                    <f.icon size={20} style={{ color: C.accent }} />
                  </div>
                  <h3 className="font-bold text-base text-vel-ink mb-1.5" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.3px' }}>
                    {f.title[lang]}
                  </h3>
                  <p className="text-vel-muted text-sm leading-relaxed">{f.desc[lang]}</p>
                </motion.div>
              ))}
            </div>

            {/* ── Toutes les voitures disponibles, directement sous la carte ── */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="w-full mt-16"
            >
              <ErrorBoundary fallback={null}>
                <OffersListing
                  lang={lang}
                  cars={cars}
                  specialOffers={specialOffers}
                  onOrder={onOrderCar}
                  embedded
                  heading={{ fr: 'Disponibles maintenant', ar: 'متاحة الآن' }}
                  subheading={{ fr: 'Choisissez votre voiture', ar: 'اختر سيارتك' }}
                />
              </ErrorBoundary>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES SECTION ══ */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{
        background: 'linear-gradient(180deg, #0A0A08 0%, #12110B 50%, #0A0A08 100%)',
        borderTop: '1px solid rgba(200,161,60,0.12)',
        borderBottom: '1px solid rgba(200,161,60,0.12)',
      }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <p className="volz-eyebrow mb-4">
              {{ fr: 'Pourquoi nous choisir', ar: 'لماذا تختارنا' }[lang]}
            </p>
            <h2 className="volz-h2">
              {{ fr: "L'expérience automobile premium", ar: 'تجربة السيارات الفاخرة' }[lang]}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                whileHover={{ y: -6 }}
                className="rounded-2xl p-8 space-y-4 transition-all duration-300 cursor-default"
                style={{
                  background: 'rgba(200, 161, 60,0.04)',
                  border: '1px solid rgba(200, 161, 60,0.09)',
                  backdropFilter: 'blur(12px)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${C.accent}35`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${C.accent}12`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200, 161, 60,0.09)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${C.accent}14`, border: `1px solid ${C.accent}35` }}>
                  <f.icon size={22} style={{ color: C.accent }} />
                </div>
                <h3 className="font-bold text-lg text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
                  {f.title[lang]}
                </h3>
                <p className="text-vel-muted text-sm leading-relaxed">{f.desc[lang]}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TÉMOIGNAGES (façon VÖLZ « What our travelers say ») ══ */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 volz-aura" style={{ background: C.bg }}>
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-14"
          >
            <p className="volz-eyebrow mb-4">
              {{ fr: 'Ils nous font confiance', ar: 'يثقون بنا' }[lang]}
            </p>
            <h2 className="volz-h2">
              {{ fr: 'Ce que disent nos clients', ar: 'ماذا يقول عملاؤنا' }[lang]}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: 'Sirine B.', handle: '@sirine.b', initials: 'SB',
                quote: { fr: "Réservation en 3 minutes, voiture impeccable et livrée à l'heure. Je recommande les yeux fermés.",
                         ar: 'الحجز في 3 دقائق، سيارة ممتازة وتم تسليمها في الوقت المحدد. أنصح بها بثقة.' } },
              { name: 'Yacine M.', handle: '@yacine.m', initials: 'YM',
                quote: { fr: "J'ai pu payer en espèces à l'agence, tout était clair : kilométrage, assurance, caution. Zéro surprise.",
                         ar: 'دفعت نقداً في الوكالة، كل شيء كان واضحاً: العداد، التأمين، الضمان. بدون أي مفاجأة.' } },
              { name: 'Lina K.', handle: '@lina.k', initials: 'LK',
                quote: { fr: "La flotte est récente et bien entretenue. Le SUV que j'ai pris était comme neuf.",
                         ar: 'الأسطول حديث ومُعتنى به جيداً. سيارة الدفع الرباعي التي أخذتها كانت كالجديدة.' } },
            ].map((t, i) => (
              <motion.figure
                key={i}
                initial={{ opacity: 0, y: 34 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="volz-feature p-6 flex flex-col"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={15} style={{ color: C.accent, fill: C.accent }} />
                  ))}
                </div>
                <blockquote className="text-vel-slate text-[15px] leading-relaxed flex-1">
                  “{t.quote[lang]}”
                </blockquote>
                <figcaption className="flex items-center gap-3 mt-5 pt-5" style={{ borderTop: '1px solid rgba(200,161,60,0.14)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ fontFamily: 'var(--font-display)', color: '#14130E', background: `linear-gradient(135deg, #E4C878, #B8912E)` }}>
                    {t.initials}
                  </div>
                  <div className="leading-tight">
                    <p className="font-bold text-sm text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>{t.name}</p>
                    <p className="text-vel-dim text-xs">{t.handle}</p>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SHOWCASE BAND (voiture en arrière-plan + titre) ══ */}
      <ShowcaseBand lang={lang} onReserve={onStartRenting} imageUrl={showcaseImage} />

      {/* ══ CTA BANNER ══ */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: C.bg }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse at center, ${C.accentDim}, transparent 65%)`,
        }} />

        <div className="absolute top-1/2 left-0 right-0 flex items-center justify-center gap-4 pointer-events-none">
          <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${C.accent}22)` }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.accent }} />
          <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${C.accent}22)` }} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <h2 className="volz-h2 mb-6" style={{ fontSize: 'clamp(2.4rem, 1.4rem + 3.4vw, 3.6rem)' }}>
            {{ fr: 'Prêt à prendre la route ?', ar: 'مستعد للانطلاق؟' }[lang]}
          </h2>
          <p className="text-vel-slate text-lg mb-10">
            {{ fr: "Réservez votre véhicule dès aujourd'hui et vivez l'expérience.", ar: 'احجز سيارتك اليوم وعش التجربة.' }[lang]}
          </p>
          <motion.button
            onClick={onStartRenting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 text-lg px-12 py-5 rounded-xl font-bold transition-all duration-300"
            style={{
              fontFamily: 'var(--font-display)',
              background: `linear-gradient(135deg, ${C.accent}, #B8912E)`,
              color: '#FFFFFF',
              boxShadow: `0 6px 18px rgba(200, 161, 60,0.28)`,
            }}
          >
            <CarIcon size={20} /> {{ fr: 'Voir tous les véhicules', ar: 'عرض جميع السيارات' }[lang]}
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};
