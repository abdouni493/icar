import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { useWizard } from './WizardContext';
import {
  SectionCard, SectionTitle, FieldLabel, inputClass, inputStyle,
  focusInput, blurInput, C, fromYmd,
} from './wizardUi';
import { trackMetaPixel } from '../../../utils/metaPixel';
import { trackTikTokPixel } from '../../../utils/tiktokPixel';

/**
 * Étape 4 (dernière) — Informations du client + envoi WhatsApp.
 *
 * Le client peut (facultativement) renseigner son nom, prénom et email, puis
 * finaliser sa demande directement via WhatsApp. Toutes les informations
 * (voiture, période, assurance, coordonnées saisies) sont compilées dans un
 * message envoyé au numéro WhatsApp de l'agence. AUCUNE réservation n'est créée
 * dans l'application : l'échange se poursuit manuellement sur WhatsApp.
 */
export const StepInfoWhatsApp: React.FC = () => {
  const {
    lang, contactInfo, websiteSettings, car, range, departureTime, returnTime,
    agencies, departureAgency, differentReturnAgency, returnAgency,
    selectedAssurance, days, total, fx, fxValue, currency,
    personal, setPersonal, prev,
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

    // Coordonnées du client (facultatives)
    const fullName = `${personal.firstName || ''} ${personal.lastName || ''}`.trim();
    if (fullName || personal.email) {
      lines.push(L ? `👤 *Client*` : `👤 *العميل*`);
      if (fullName) lines.push(L ? `Nom : ${fullName}` : `الاسم : ${fullName}`);
      if (personal.email) lines.push(L ? `Email : ${personal.email}` : `البريد الإلكتروني : ${personal.email}`);
      lines.push('');
    }

    lines.push(L ? `💰 *Total estimé* : ${money(total)}` : `💰 *المجموع التقديري* : ${money(total)}`);
    return lines.join(nl);
  };

  // Ouvre WhatsApp avec le message pré-rempli. Ne crée AUCUNE réservation.
  const handleWhatsApp = () => {
    if (!waNumber) return;
    // Suivi Meta Ads : demande de réservation via WhatsApp = prospect (Lead).
    trackMetaPixel('Lead', {
      content_type: 'vehicle',
      content_ids: car ? [car.id] : [],
      content_name: car ? `${car.brand} ${car.model}` : undefined,
      value: fxValue(total),
      currency,
    });
    // Suivi TikTok Ads : demande WhatsApp = prise de contact (Contact).
    trackTikTokPixel('Contact', {
      contents: car ? [{ content_id: car.id, content_type: 'product', content_name: `${car.brand} ${car.model}` }] : [],
      value: fxValue(total),
      currency,
    });
    const text = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* ── Informations du client (toutes facultatives) ── */}
      <SectionCard>
        <SectionTitle>👤 {{ fr: 'Vos informations (optionnel)', ar: 'معلوماتك (اختياري)' }[lang]}</SectionTitle>
        <p className="text-vel-muted text-sm -mt-2">
          {{
            fr: 'Ces informations sont facultatives — elles seront ajoutées à votre message WhatsApp.',
            ar: 'هذه المعلومات اختيارية — ستُضاف إلى رسالتك عبر واتساب.',
          }[lang]}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>{{ fr: 'Nom de famille', ar: 'اللقب' }[lang]}</FieldLabel>
            <input
              type="text"
              value={personal.lastName}
              onChange={e => setPersonal(p => ({ ...p, lastName: e.target.value }))}
              placeholder={L ? 'Ex : Benali' : 'مثال: بن علي'}
              className={inputClass}
              style={inputStyle}
              onFocus={focusInput}
              onBlur={blurInput}
            />
          </div>
          <div>
            <FieldLabel>{{ fr: 'Prénom', ar: 'الاسم' }[lang]}</FieldLabel>
            <input
              type="text"
              value={personal.firstName}
              onChange={e => setPersonal(p => ({ ...p, firstName: e.target.value }))}
              placeholder={L ? 'Ex : Amine' : 'مثال: أمين'}
              className={inputClass}
              style={inputStyle}
              onFocus={focusInput}
              onBlur={blurInput}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>{{ fr: 'Email', ar: 'البريد الإلكتروني' }[lang]}</FieldLabel>
            <input
              type="email"
              value={personal.email}
              onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))}
              placeholder={L ? 'Ex : amine@email.com' : 'مثال: amine@email.com'}
              className={inputClass}
              style={inputStyle}
              onFocus={focusInput}
              onBlur={blurInput}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Finaliser directement via WhatsApp (ne crée AUCUNE réservation) ── */}
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
                fr: "Nous préparons un message avec votre voiture, la période, l'assurance et vos coordonnées. Il s'ouvre dans WhatsApp — vous l'envoyez vous-même à l'agence.",
                ar: 'نُجهّز رسالة تتضمن سيارتك والفترة والتأمين ومعلوماتك. تُفتح في واتساب لترسلها بنفسك إلى الوكالة.'
              }[lang]}
            </p>
          </div>
        </div>

        {waNumber ? (
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
        ) : (
          <p className="text-center text-vel-dim text-sm font-semibold">
            {{
              fr: "Aucun numéro WhatsApp n'est configuré pour le moment.",
              ar: 'لا يوجد رقم واتساب مُعدّ حاليًا.',
            }[lang]}
          </p>
        )}
      </motion.div>

      {/* Navigation — retour uniquement (dernière étape) */}
      <div className="flex gap-4">
        <button
          onClick={prev}
          className="btn-vel-ghost flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold"
        >
          <ChevronLeft size={18} /> {{ fr: 'Précédent', ar: 'السابق' }[lang]}
        </button>
      </div>
    </div>
  );
};
