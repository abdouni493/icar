import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2, MessageCircle, ArrowRight } from 'lucide-react';
import { useWizard } from './WizardContext';
import { SectionCard, SectionTitle, C, fromYmd } from './wizardUi';

/**
 * Étape 4 — Services (optionnel).
 * Cartes sélectionnables depuis les services existants ; n'en choisir aucun est permis.
 * Les services choisis s'ajoutent au total de l'étape 5.
 *
 * Nouveauté : le client peut finaliser sa demande directement via WhatsApp.
 * Toutes les informations (voiture + photo, période, assurance, services, total)
 * sont compilées dans un message envoyé au numéro WhatsApp de l'agence. Dans ce
 * cas, AUCUNE réservation n'est créée dans l'application : l'échange se poursuit
 * manuellement sur WhatsApp. Sinon, « Suivant » continue le parcours normal.
 */
export const StepServices: React.FC = () => {
  const {
    lang, availableServices, loadingServices, selectedServices, toggleService,
    contactInfo, websiteSettings, car, range, departureTime, returnTime,
    agencies, departureAgency, differentReturnAgency, returnAgency,
    selectedAssurance, days, total, fx, next, isStepValid,
  } = useWizard();

  const L = lang === 'fr';
  const waNumber = (contactInfo?.whatsapp || '').replace(/\D/g, '');

  // Compose un message récapitulatif structuré pour WhatsApp.
  const buildWhatsAppMessage = (): string => {
    const nl = '\n';
    const money = (dzd: number) => fx(dzd);
    const agencyName = (id: string) => agencies.find(a => a.id === id)?.name || '—';
    const fmtDate = (ymd?: string) => {
      if (!ymd) return '—';
      try { return fromYmd(ymd).toLocaleDateString(L ? 'fr-FR' : 'ar-DZ', { day: '2-digit', month: 'long', year: 'numeric' }); }
      catch { return ymd; }
    };
    const depAg = agencyName(departureAgency);
    const retAg = agencyName(differentReturnAgency ? returnAgency : departureAgency);

    const lines: string[] = [];
    const site = websiteSettings?.name ? ` — ${websiteSettings.name}` : '';
    lines.push(L ? `🚗 Nouvelle demande de réservation${site}` : `🚗 طلب حجز جديد${site}`);
    lines.push('');

    if (car) {
      lines.push(L ? `*Voiture* : ${car.brand} ${car.model} (${car.year})` : `*السيارة* : ${car.brand} ${car.model} (${car.year})`);
      if (car.registration) lines.push(L ? `Immatriculation : ${car.registration}` : `الترقيم : ${car.registration}`);
      if (car.color) lines.push(L ? `Couleur : ${car.color}` : `اللون : ${car.color}`);
      const img = car.images?.[0];
      if (img) lines.push(L ? `Photo : ${img}` : `صورة : ${img}`);
      lines.push('');
    }

    lines.push(L ? `📅 *Période*` : `📅 *الفترة*`);
    lines.push(L ? `Départ : ${fmtDate(range.from)} à ${departureTime} — ${depAg}` : `الانطلاق : ${fmtDate(range.from)} على ${departureTime} — ${depAg}`);
    lines.push(L ? `Retour : ${fmtDate(range.to)} à ${returnTime} — ${retAg}` : `العودة : ${fmtDate(range.to)} على ${returnTime} — ${retAg}`);
    lines.push(L ? `Durée : ${days} jour(s)` : `المدة : ${days} يوم`);
    lines.push('');

    if (selectedAssurance) {
      lines.push(L
        ? `🛡️ *Assurance* : ${selectedAssurance.name} (${money(selectedAssurance.pricePerDay)} / jour)`
        : `🛡️ *التأمين* : ${selectedAssurance.name} (${money(selectedAssurance.pricePerDay)} / يوم)`);
      lines.push('');
    }

    if (selectedServices.length > 0) {
      lines.push(L ? `🛎️ *Services*` : `🛎️ *الخدمات*`);
      selectedServices.forEach(s => lines.push(`• ${s.name} : ${money(s.price)}`));
      lines.push('');
    }

    lines.push(L ? `💰 *Total estimé* : ${money(total)}` : `💰 *المجموع التقديري* : ${money(total)}`);
    return lines.join(nl);
  };

  // Ouvre WhatsApp avec le message pré-rempli. Ne crée AUCUNE réservation.
  const handleWhatsApp = () => {
    if (!waNumber) return;
    const text = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  // La demande WhatsApp n'est proposée que si l'étape 1 (voiture + dates) est
  // valide ET qu'un numéro WhatsApp est configuré côté agence.
  const canWhatsApp = !!waNumber && isStepValid(1);

  return (
    <div className="space-y-6">
      <SectionCard>
        <SectionTitle>🛎️ {{ fr: 'Services supplémentaires (optionnel)', ar: 'الخدمات الإضافية (اختياري)' }[lang]}</SectionTitle>
        <p className="text-vel-muted text-sm -mt-2">
          {{ fr: 'Sélectionnez les services que vous souhaitez ajouter — vous pouvez aussi passer cette étape', ar: 'اختر الخدمات التي تريد إضافتها — يمكنك أيضًا تخطي هذه الخطوة' }[lang]}
        </p>

        {loadingServices ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin" style={{ color: C.accent }} />
          </div>
        ) : availableServices.length === 0 ? (
          <div className="text-center py-12 text-vel-dim">
            <p className="font-bold">{{ fr: 'Aucun service disponible', ar: 'لا توجد خدمات' }[lang]}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableServices.map((service, i) => {
              const isSelected = selectedServices.some(s => s.id === service.id);
              // Service obligatoire : toujours coché, non décochable.
              const isMandatory = !!service.isMandatory;
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggleService({
                    id: service.id,
                    name: service.name || service.service_name,
                    price: service.price,
                    description: service.description,
                    category: service.category || 'service',
                    selected: false,
                    isMandatory,
                  } as any)}
                  className={`rounded-2xl p-5 transition-all duration-300 relative overflow-hidden ${isMandatory ? 'cursor-default' : 'cursor-pointer'}`}
                  style={{
                    background: isSelected ? 'rgba(200, 161, 60,0.05)' : C.elevated,
                    border: isSelected ? '1px solid rgba(200, 161, 60,0.25)' : '1px solid rgba(245,240,225,0.06)',
                    boxShadow: isSelected ? '0 0 20px rgba(200, 161, 60,0.08)' : 'none',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-vel-ink text-sm flex items-center gap-2 flex-wrap" style={{ fontFamily: 'var(--font-display)' }}>
                        {service.name || service.service_name}
                        {isMandatory && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                            style={{ color: '#C8A13C', background: 'rgba(200, 161, 60,0.1)', border: '1px solid rgba(200, 161, 60,0.25)' }}>
                            {{ fr: 'Inclus', ar: 'مشمول' }[lang]}
                          </span>
                        )}
                      </h4>
                      {service.description && (
                        <p className="text-vel-muted text-xs mt-1 leading-relaxed">{service.description}</p>
                      )}
                      <p className="font-black text-base mt-2" style={{ color: C.accent }}>
                        {service.price.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{
                        background: isSelected ? C.accent : 'transparent',
                        border: isSelected ? `2px solid ${C.accent}` : '2px solid rgba(245,240,225,0.15)',
                      }}>
                      {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Résumé services sélectionnés */}
      <AnimatePresence>
        {selectedServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="rounded-2xl p-6 space-y-3"
            style={{ background: 'rgba(200, 161, 60,0.05)', border: '1px solid rgba(200, 161, 60,0.16)' }}
          >
            <h4 className="font-black text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
              🛒 {{ fr: 'Services sélectionnés', ar: 'الخدمات المختارة' }[lang]}
            </h4>
            {selectedServices.map(s => (
              <div key={s.id} className="flex justify-between items-center text-sm">
                <span className="text-vel-slate">{s.name}</span>
                <span className="font-bold" style={{ color: C.accent }}>{s.price.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}</span>
              </div>
            ))}
            <div className="pt-3 flex justify-between items-center font-black text-base" style={{ borderTop: '1px solid rgba(200, 161, 60,0.16)' }}>
              <span className="text-vel-ink">{{ fr: 'Total services', ar: 'إجمالي الخدمات' }[lang]}</span>
              <span style={{ color: C.accent }}>{selectedServices.reduce((s, x) => s + x.price, 0).toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Finaliser directement via WhatsApp (ne crée AUCUNE réservation) ── */}
      {canWhatsApp && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 sm:p-7 space-y-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.10), rgba(18, 17, 9, 0.6))',
            border: '1px solid rgba(37, 211, 102, 0.35)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          }}
        >
          {/* Séparateur « ou » */}
          <div className="flex items-center gap-3 -mt-1">
            <div className="h-px flex-1" style={{ background: 'rgba(200,161,60,0.25)' }} />
            <span className="text-[11px] font-black tracking-[0.3em] uppercase text-vel-dim" style={{ fontFamily: 'var(--font-display)' }}>
              {{ fr: 'OU', ar: 'أو' }[lang]}
            </span>
            <div className="h-px flex-1" style={{ background: 'rgba(200,161,60,0.25)' }} />
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(37, 211, 102, 0.15)', border: '1px solid rgba(37, 211, 102, 0.4)' }}>
              <MessageCircle size={24} style={{ color: '#25D366' }} />
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-vel-ink text-base" style={{ fontFamily: 'var(--font-display)' }}>
                {{ fr: 'Réserver directement via WhatsApp', ar: 'احجز مباشرة عبر واتساب' }[lang]}
              </h4>
              <p className="text-vel-muted text-sm mt-1 leading-relaxed">
                {{
                  fr: "Nous préparons un message avec votre voiture, la période, l'assurance et les services choisis. Il s'ouvre dans WhatsApp — vous l'envoyez vous-même à l'agence. Aucune réservation n'est créée dans le système.",
                  ar: 'نُجهّز رسالة تتضمن سيارتك والفترة والتأمين والخدمات المختارة. تُفتح في واتساب لترسلها بنفسك إلى الوكالة. لن يتم إنشاء أي حجز في النظام.'
                }[lang]}
              </p>
            </div>
          </div>

          <motion.button
            onClick={handleWhatsApp}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #25D366, #1DA851)',
              color: '#06240F',
              boxShadow: '0 8px 24px rgba(37, 211, 102, 0.35)',
            }}
          >
            <MessageCircle size={18} />
            {{ fr: 'Envoyer ma demande sur WhatsApp', ar: 'إرسال طلبي عبر واتساب' }[lang]}
          </motion.button>

          <p className="text-center text-vel-dim text-xs">
            {{ fr: '— ou continuez pour réserver en ligne —', ar: '— أو تابع للحجز عبر الإنترنت —' }[lang]}
          </p>

          <motion.button
            onClick={() => next()}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="btn-vel-outline-cyan w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold"
          >
            {{ fr: 'Continuer la réservation en ligne', ar: 'متابعة الحجز عبر الإنترنت' }[lang]}
            <ArrowRight size={16} />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
};
