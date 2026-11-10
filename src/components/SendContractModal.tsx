import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Loader, MessageCircle } from 'lucide-react';
import { Language, ReservationDetails, WhatsAppSettings } from '../types';
import { EmailService } from '../services/emailService';
import { WhatsAppService } from '../services/whatsappService';
import { DatabaseService } from '../services/DatabaseService';

interface SendContractModalProps {
  lang: Language;
  reservation: ReservationDetails;
  onClose: () => void;
}

export const SendContractModal: React.FC<SendContractModalProps> = ({
  lang,
  reservation,
  onClose,
}) => {
  const [clientEmail, setClientEmail] = useState(reservation.client.email || '');
  const [clientPhone, setClientPhone] = useState(reservation.client.phone || '');
  const [countryCode, setCountryCode] = useState(WhatsAppService.DEFAULT_COUNTRY_CODE);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [waSettings, setWaSettings] = useState<WhatsAppSettings | null>(null);
  const [senderEmail, setSenderEmail] = useState('');
  const [templateLang, setTemplateLang] = useState<'fr' | 'ar'>('ar');
  const [documentType, setDocumentType] = useState<'contract' | 'devis' | 'recu' | 'engagement' | 'facture' | 'inspection' | 'reservation'>('contract');
  const [loading, setLoading] = useState(false);
  const [loadingSender, setLoadingSender] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [saveEmailToClient, setSaveEmailToClient] = useState(false);

  // Load sender email from website contacts on mount
  useEffect(() => {
    const loadSenderEmail = async () => {
      try {
        setLoadingSender(true);
        const contacts = await DatabaseService.getWebsiteContacts();
        if (contacts.email) {
          setSenderEmail(contacts.email);
        } else {
          setNotification({
            type: 'error',
            message: lang === 'fr' 
              ? 'Email de contact non configuré. Veuillez le configurer dans les paramètres.'
              : 'لم يتم تكوين بريد الاتصال. يرجى تكوينه في الإعدادات.',
          });
        }
      } catch (error) {
        console.error('Error loading sender email:', error);
        setNotification({
          type: 'error',
          message: lang === 'fr' 
            ? 'Erreur lors du chargement de l\'email de contact'
            : 'خطأ في تحميل بريد الاتصال',
        });
      } finally {
        setLoadingSender(false);
      }
    };

    loadSenderEmail();
  }, [lang]);

  // Charge la configuration WhatsApp (envoi automatique via Cloud API).
  useEffect(() => {
    DatabaseService.getWhatsAppSettings()
      .then((s) => {
        setWaSettings(s);
        if (s?.default_country_code) setCountryCode(s.default_country_code);
      })
      .catch((e) => console.warn('getWhatsAppSettings failed', e));
  }, []);

  // Clear notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSendEmail = async () => {
    // Validate and sanitize email
    const trimmedEmail = clientEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setNotification({
        type: 'error',
        message: lang === 'fr' ? 'Veuillez entrer une adresse email valide' : 'يرجى إدخال عنوان بريد إلكتروني صحيح',
      });
      return;
    }

    if (!senderEmail) {
      setNotification({
        type: 'error',
        message: lang === 'fr' 
          ? 'Email de contact non configuré'
          : 'بريد الاتصال غير مكون',
      });
      return;
    }

    try {
      setLoading(true);
      const documentNames = {
        contract: lang === 'fr' ? 'Contrat' : 'العقد',
        devis: lang === 'fr' ? 'Devis' : 'عرض أسعار',
        recu: lang === 'fr' ? 'Reçu' : 'إيصال',
        engagement: lang === 'fr' ? 'Engagement' : 'التزام',
        facture: lang === 'fr' ? 'Facture' : 'الفاتورة',
        inspection: lang === 'fr' ? 'Inspection' : 'فحص المركبة',
        reservation: lang === 'fr' ? 'Réservation' : 'الحجز'
      };

      setNotification({
        type: 'info',
        message: lang === 'fr' ? `Envoi du ${documentNames[documentType]}...` : `جاري إرسال ${documentNames[documentType]}...`,
      });

      // Generate document HTML based on selected document type
      const htmlContent = await EmailService.generateDocumentHTML(reservation, templateLang, documentType);

      // Send email via Edge Function with trimmed email
      const result = await EmailService.sendContractEmail({
        clientEmail: trimmedEmail,
        clientName: `${reservation.client.firstName} ${reservation.client.lastName}`,
        reservationId: reservation.id,
        senderEmail,
        htmlContent,
        templateLang,
        documentType,
      });

      if (result.success) {
        // If requested, save email to client record
        if (saveEmailToClient && trimmedEmail !== reservation.client.email) {
          try {
            await DatabaseService.updateClient(reservation.client.id, {
              email: trimmedEmail,
            });
          } catch (updateError) {
            console.error('Error updating client email:', updateError);
            // Don't fail the whole operation if email update fails
          }
        }

        setNotification({
          type: 'success',
          message: lang === 'fr' 
            ? `${documentNames[documentType]} envoyé avec succès! ✅`
            : `تم إرسال ${documentNames[documentType]} بنجاح! ✅`,
        });

        // Close modal after success
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setNotification({
          type: 'error',
          message: result.message || (lang === 'fr' ? 'Erreur lors de l\'envoi' : 'خطأ في الإرسال'),
        });
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      setNotification({
        type: 'error',
        message: error.message || (lang === 'fr' 
          ? 'Erreur lors de l\'envoi du document'
          : 'خطأ في إرسال المستند'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    const normalized = WhatsAppService.normalizePhone(clientPhone, countryCode);
    if (!WhatsAppService.isValidPhone(normalized)) {
      setNotification({
        type: 'error',
        message: lang === 'fr'
          ? 'Veuillez entrer un numéro WhatsApp valide'
          : 'يرجى إدخال رقم واتساب صحيح',
      });
      return;
    }

    const autoMode = !!(waSettings?.enabled && waSettings?.phone_number_id && waSettings?.access_token);

    // Mode manuel (click-to-chat) : ouvre une fenêtre dans le geste utilisateur
    // pour éviter le blocage des popups. En mode automatique, rien ne s'ouvre.
    const waWindow = autoMode ? null : window.open('', '_blank');

    try {
      setWhatsappLoading(true);
      const documentNames = {
        contract: lang === 'fr' ? 'Contrat' : 'العقد',
        devis: lang === 'fr' ? 'Devis' : 'عرض أسعار',
        recu: lang === 'fr' ? 'Reçu' : 'إيصال',
        engagement: lang === 'fr' ? 'Engagement' : 'التزام',
        facture: lang === 'fr' ? 'Facture' : 'الفاتورة',
        inspection: lang === 'fr' ? 'Inspection' : 'فحص المركبة',
        reservation: lang === 'fr' ? 'Réservation' : 'الحجز'
      };

      setNotification({
        type: 'info',
        message: lang === 'fr'
          ? `${autoMode ? 'Envoi' : 'Préparation'} du ${documentNames[documentType]} WhatsApp...`
          : `جاري ${autoMode ? 'إرسال' : 'تحضير'} ${documentNames[documentType]} واتساب...`,
      });

      const htmlContent = await EmailService.generateDocumentHTML(reservation, templateLang, documentType);

      // Enregistre le numéro sur la fiche client si modifié.
      const persistPhone = async () => {
        if (clientPhone && clientPhone !== reservation.client.phone) {
          try {
            await DatabaseService.updateClient(reservation.client.id, { phone: clientPhone });
          } catch (updateError) {
            console.error('Error updating client phone:', updateError);
          }
        }
      };

      if (autoMode) {
        // ===== ENVOI AUTOMATIQUE via WhatsApp Cloud API =====
        const result = await WhatsAppService.sendViaCloudAPI({
          settings: waSettings!,
          reservation,
          htmlContent,
          clientPhone,
          templateLang,
          documentType,
        });

        if (result.success) {
          await persistPhone();
          setNotification({
            type: 'success',
            message: lang === 'fr'
              ? `${documentNames[documentType]} envoyé sur WhatsApp ✅`
              : `تم إرسال ${documentNames[documentType]} على واتساب ✅`,
          });
          setTimeout(() => onClose(), 1800);
        } else {
          setNotification({
            type: 'error',
            message: result.message || (lang === 'fr' ? 'Erreur WhatsApp' : 'خطأ واتساب'),
          });
        }
        return;
      }

      // ===== MODE MANUEL (gratuit, click-to-chat) =====
      const result = await WhatsAppService.sendDocument({
        reservation,
        htmlContent,
        clientPhone,
        countryCode,
        templateLang,
        documentType,
      });

      if (result.success && result.waLink) {
        await persistPhone();
        if (waWindow && !waWindow.closed) {
          waWindow.location.href = result.waLink;
        } else {
          window.open(result.waLink, '_blank');
        }
        setNotification({
          type: 'success',
          message: lang === 'fr'
            ? `WhatsApp ouvert — appuyez sur Envoyer ✅`
            : `تم فتح واتساب — اضغط على إرسال ✅`,
        });
        setTimeout(() => onClose(), 1800);
      } else {
        if (waWindow && !waWindow.closed) waWindow.close();
        setNotification({
          type: 'error',
          message: result.message || (lang === 'fr' ? 'Erreur WhatsApp' : 'خطأ واتساب'),
        });
      }
    } catch (error: any) {
      if (waWindow && !waWindow.closed) waWindow.close();
      console.error('Error sending via WhatsApp:', error);
      setNotification({
        type: 'error',
        message: error.message || (lang === 'fr'
          ? 'Erreur lors de l\'envoi WhatsApp'
          : 'خطأ في إرسال واتساب'),
      });
    } finally {
      setWhatsappLoading(false);
    }
  };

  const bgNotificationColor =
    notification?.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
    notification?.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
    'bg-blue-50 border-blue-200 text-blue-800';

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto sm:py-8"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-saas-border flex flex-col max-h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 text-white p-8 flex items-center justify-between border-b border-white/10">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                📧 {lang === 'fr' ? 'Envoyer un Document' : 'إرسال مستند'}
              </h2>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
                {lang === 'fr' ? 'Envoi par email ou WhatsApp au client' : 'إرسال بالبريد أو واتساب للعميل'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-white/20 rounded-lg transition-colors"
              disabled={loading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar bg-white">
            {/* Client Info */}
            <div className="space-y-3">
              <h3 className="font-bold text-saas-text-main">
                👤 {lang === 'fr' ? 'Client' : 'العميل'}
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="font-bold text-saas-text-main">
                  {reservation.client.firstName} {reservation.client.lastName}
                </p>
                <p className="text-sm text-saas-text-muted">
                  {lang === 'fr' ? 'Réservation #' : 'الحجز #'}{reservation.id}
                </p>
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block font-bold text-saas-text-main">
                📧 {lang === 'fr' ? 'Email du Client' : 'بريد العميل'}
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors disabled:bg-slate-100"
              />
            </div>

            {/* WhatsApp Number Input */}
            <div className="space-y-2">
              <label className="block font-bold text-saas-text-main">
                💬 {lang === 'fr' ? 'Numéro WhatsApp du Client' : 'رقم واتساب العميل'}
              </label>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 px-3 py-3 border-2 border-slate-200 rounded-lg bg-slate-50">
                  <span className="text-saas-text-muted font-bold">+</span>
                  <input
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ''))}
                    disabled={loading || whatsappLoading}
                    className="w-14 bg-transparent focus:outline-none font-mono text-sm disabled:opacity-50"
                    placeholder="213"
                    dir="ltr"
                  />
                </div>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="0661 23 45 67"
                  disabled={loading || whatsappLoading}
                  dir="ltr"
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors disabled:bg-slate-100"
                />
              </div>
              <p className="text-[11px] text-saas-text-muted">
                {waSettings?.enabled && waSettings?.phone_number_id && waSettings?.access_token
                  ? (lang === 'fr'
                      ? '⚡ Envoi automatique activé : le PDF part directement sur WhatsApp.'
                      : '⚡ الإرسال التلقائي مفعّل: يُرسل ملف PDF مباشرة على واتساب.')
                  : (lang === 'fr'
                      ? 'Le PDF sera hébergé et son lien pré-rempli dans WhatsApp (envoi manuel).'
                      : 'سيتم استضافة ملف PDF وإدراج رابطه في واتساب (إرسال يدوي).')}
              </p>
            </div>

            {/* Template Language Selection */}
            <div className="space-y-2">
              <label className="block font-bold text-saas-text-main">
                🌐 {lang === 'fr' ? 'Langue du Document' : 'لغة المستند'}
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTemplateLang('fr')}
                  disabled={loading}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                    templateLang === 'fr'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 text-saas-text-main hover:bg-slate-200'
                  } disabled:opacity-50`}
                >
                  🇫🇷 Français
                </button>
                <button
                  onClick={() => setTemplateLang('ar')}
                  disabled={loading}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                    templateLang === 'ar'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 text-saas-text-main hover:bg-slate-200'
                  } disabled:opacity-50`}
                >
                  🇸🇦 العربية
                </button>
              </div>
            </div>

            {/* Document Type Selection */}
            <div className="space-y-2">
              <label className="block font-bold text-saas-text-main">
                📄 {lang === 'fr' ? 'Type de Document' : 'نوع المستند'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'contract', label: lang === 'fr' ? 'Contrat' : 'عقد', icon: '📄' },
                  { id: 'devis', label: lang === 'fr' ? 'Devis' : 'عرض أسعار', icon: '📋' },
                  { id: 'recu', label: lang === 'fr' ? 'Reçu' : 'إيصال', icon: '💳' },
                  { id: 'engagement', label: lang === 'fr' ? 'Engagement' : 'التزام', icon: '🤝' },
                  { id: 'facture', label: lang === 'fr' ? 'Facture' : 'الفاتورة', icon: '🧾' },
                  { id: 'inspection', label: lang === 'fr' ? 'Inspection' : 'فحص', icon: '🔍' },
                  { id: 'reservation', label: lang === 'fr' ? 'Réservation' : 'الحجز', icon: '📅' }
                ].map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setDocumentType(doc.id as typeof documentType)}
                    disabled={loading}
                    className={`py-3 px-3 rounded-lg font-bold text-sm transition-all ${
                      documentType === doc.id
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-100 text-saas-text-main hover:bg-slate-200'
                    } disabled:opacity-50`}
                  >
                    {doc.icon} {doc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sender Email Display */}
            <div className="space-y-2">
              <label className="block font-bold text-saas-text-main">
                {lang === 'fr' ? 'De (Email de contact):' : 'من (بريد الاتصال):'}
              </label>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                {loadingSender ? (
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-saas-text-muted">
                      {lang === 'fr' ? 'Chargement...' : 'جاري التحميل...'}
                    </span>
                  </div>
                ) : (
                  <p className="font-mono text-sm text-saas-text-main break-all">{senderEmail || 'N/A'}</p>
                )}
              </div>
            </div>

            {/* Save Email Checkbox */}
            {clientEmail && clientEmail !== reservation.client.email && (
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  checked={saveEmailToClient}
                  onChange={(e) => setSaveEmailToClient(e.target.checked)}
                  disabled={loading}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-saas-text-main">
                  {lang === 'fr' 
                    ? 'Enregistrer cet email pour le client'
                    : 'احفظ هذا البريد للعميل'}
                </span>
              </label>
            )}

            {/* Notification */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  key="notification"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-lg border-2 text-sm font-bold ${bgNotificationColor}`}
                >
                  {notification.message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Buttons */}
          <div className="bg-saas-bg p-8 border-t border-saas-border flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={handleSendEmail}
                disabled={loading || whatsappLoading || !clientEmail || !senderEmail}
                className="flex-1 py-3 px-4 rounded-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {lang === 'fr' ? 'Envoi...' : 'جاري الإرسال...'}
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    {lang === 'fr' ? 'Email' : 'بريد'}
                  </>
                )}
              </button>
              <button
                onClick={handleSendWhatsApp}
                disabled={loading || whatsappLoading || !clientPhone}
                className="flex-1 py-3 px-4 rounded-lg font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {whatsappLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {lang === 'fr' ? 'Préparation...' : 'جاري التحضير...'}
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    {lang === 'fr' ? 'WhatsApp' : 'واتساب'}
                  </>
                )}
              </button>
            </div>
            <button
              onClick={onClose}
              disabled={loading || whatsappLoading}
              className="w-full py-3 px-4 rounded-lg font-bold bg-saas-bg hover:bg-saas-secondary-start/10 text-saas-text-muted border border-saas-border hover:border-saas-secondary-start/20 transition-all disabled:opacity-50"
            >
              {lang === 'fr' ? 'Annuler' : 'إلغاء'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
