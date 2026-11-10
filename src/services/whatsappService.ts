import { supabase } from '../supabase';
import { ReservationDetails } from '../types';
import { EmailService } from './emailService';

/**
 * WhatsApp Service
 * ----------------
 * Permet d'envoyer n'importe quel document imprimable (contrat, devis,
 * inspection, facture, reçu, engagement, réservation) au numéro WhatsApp d'un
 * client — exactement comme l'envoi par email, mais via WhatsApp.
 *
 * Solution 100 % GRATUITE et compatible Vercel (serverless / sans état) :
 *   1. Le PDF est généré côté navigateur (html2pdf, déjà utilisé pour l'email).
 *   2. Le PDF est téléversé dans le bucket Supabase Storage public « documents »
 *      afin d'obtenir une URL publique (téléchargeable par le client).
 *   3. On ouvre le lien officiel WhatsApp « click to chat »
 *      https://wa.me/<numero>?text=<message + lien du PDF>
 *      WhatsApp s'ouvre avec le message et le lien du document pré-remplis ;
 *      l'utilisateur appuie sur « Envoyer ».
 *
 * Aucune clé API, aucun serveur persistant, aucune session WhatsApp à maintenir
 * (whatsapp-web.js / Baileys sont incompatibles avec Vercel serverless) : cette
 * approche fonctionne donc parfaitement sur l'app en ligne Vercel.
 */
export class WhatsAppService {
  /** Bucket Supabase (public) où sont stockés les PDF partagés par WhatsApp. */
  static readonly BUCKET = 'documents';

  /** Indicatif pays par défaut (Algérie) utilisé si le numéro est local. */
  static readonly DEFAULT_COUNTRY_CODE = '213';

  /**
   * Normalise un numéro de téléphone au format international attendu par
   * wa.me (chiffres uniquement, sans « + », sans espaces ni séparateurs).
   *
   * Exemples (indicatif par défaut = 213) :
   *   "0661 23 45 67"   -> "213661234567"
   *   "+213 661 234567" -> "213661234567"
   *   "00213661234567"  -> "213661234567"
   *   "661234567"       -> "213661234567"
   */
  static normalizePhone(raw: string, countryCode: string = WhatsAppService.DEFAULT_COUNTRY_CODE): string {
    if (!raw) return '';
    const cc = String(countryCode).replace(/\D/g, '');

    // Garde uniquement les chiffres (gère les cas "+", espaces, tirets, points).
    let digits = String(raw).replace(/\D/g, '');

    // Préfixe international "00" -> on le retire (équivaut à "+").
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }

    // Déjà au format international avec le bon indicatif.
    if (cc && digits.startsWith(cc)) {
      return digits;
    }

    // Numéro local commençant par 0 (ex : 0661...) -> on retire le 0 et on
    // ajoute l'indicatif pays.
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    return cc ? `${cc}${digits}` : digits;
  }

  /** Vérifie qu'un numéro normalisé est plausible (8 à 15 chiffres). */
  static isValidPhone(normalized: string): boolean {
    return /^\d{8,15}$/.test(normalized);
  }

  /**
   * Téléverse un PDF dans le bucket public « documents » et renvoie son URL
   * publique.
   */
  static async uploadPdf(pdfBlob: Blob, documentType: string, reservationId: string): Promise<string> {
    const safeDoc = (documentType || 'document').replace(/[^a-z0-9_-]/gi, '');
    const safeRes = String(reservationId || 'doc').replace(/[^a-z0-9_-]/gi, '');
    const fileName = `whatsapp/${safeDoc}_${safeRes}_${Date.now()}.pdf`;

    const { data, error } = await supabase.storage
      .from(WhatsAppService.BUCKET)
      .upload(fileName, pdfBlob, {
        cacheControl: '31536000',
        upsert: false,
        contentType: 'application/pdf',
      });

    if (error) {
      throw new Error(
        `Échec du téléversement du PDF (bucket "${WhatsAppService.BUCKET}") : ${error.message}`,
      );
    }

    const { data: urlData } = supabase.storage
      .from(WhatsAppService.BUCKET)
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error("Impossible d'obtenir l'URL publique du PDF téléversé.");
    }

    return urlData.publicUrl;
  }

  /** Libellés des documents (pour le message WhatsApp). */
  static documentLabel(documentType: string, lang: 'fr' | 'ar'): string {
    const labels: Record<string, { fr: string; ar: string }> = {
      contract: { fr: 'Contrat de location', ar: 'عقد التأجير' },
      devis: { fr: 'Devis', ar: 'عرض الأسعار' },
      recu: { fr: 'Reçu de paiement', ar: 'إيصال الدفع' },
      engagement: { fr: "Lettre d'engagement", ar: 'رسالة الالتزام' },
      facture: { fr: 'Facture', ar: 'الفاتورة' },
      inspection: { fr: "Rapport d'inspection", ar: 'تقرير فحص المركبة' },
      reservation: { fr: 'Bon de réservation', ar: 'سند الحجز' },
    };
    return labels[documentType]?.[lang] || labels.contract[lang];
  }

  /**
   * Construit le lien WhatsApp « click to chat » avec le message + le lien du
   * PDF pré-remplis.
   */
  static buildWhatsAppLink(params: {
    phone: string;
    clientName: string;
    documentType: string;
    lang: 'fr' | 'ar';
    pdfUrl: string;
  }): string {
    const { phone, clientName, documentType, lang, pdfUrl } = params;
    const docLabel = WhatsAppService.documentLabel(documentType, lang);

    const message =
      lang === 'fr'
        ? `Bonjour ${clientName},\n\nVeuillez trouver votre ${docLabel.toLowerCase()} (PDF) en pièce jointe via ce lien :\n${pdfUrl}\n\nCordialement,\nAUTO LOCATION`
        : `مرحبا ${clientName},\n\nيمكنكم تحميل ${docLabel} (PDF) عبر هذا الرابط:\n${pdfUrl}\n\nمع أطيب التحيات,\nأوتو لوكيشن`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Point d'entrée principal : génère/téléverse le PDF, construit le lien
   * WhatsApp et renvoie tout le nécessaire. Le composant appelant se charge
   * d'ouvrir le lien (window.open) après cet appel.
   */
  static async sendDocument(params: {
    reservation: ReservationDetails;
    htmlContent: string;
    clientPhone: string;
    countryCode?: string;
    templateLang: 'fr' | 'ar';
    documentType: string;
  }): Promise<{ success: boolean; message: string; waLink?: string; pdfUrl?: string }> {
    try {
      const phone = WhatsAppService.normalizePhone(
        params.clientPhone,
        params.countryCode || WhatsAppService.DEFAULT_COUNTRY_CODE,
      );

      if (!WhatsAppService.isValidPhone(phone)) {
        throw new Error(
          params.templateLang === 'fr'
            ? 'Numéro WhatsApp invalide.'
            : 'رقم واتساب غير صالح.',
        );
      }

      // 1) HTML -> PDF (réutilise exactement la même conversion que l'email).
      const pdfBlob = await EmailService.htmlToPdf(
        params.htmlContent,
        `${params.documentType || 'document'}-${params.reservation.id}`,
      );

      // 2) Téléversement -> URL publique.
      const pdfUrl = await WhatsAppService.uploadPdf(
        pdfBlob,
        params.documentType,
        params.reservation.id,
      );

      // 3) Lien WhatsApp click-to-chat.
      const clientName = `${params.reservation.client.firstName} ${params.reservation.client.lastName}`.trim();
      const waLink = WhatsAppService.buildWhatsAppLink({
        phone,
        clientName,
        documentType: params.documentType,
        lang: params.templateLang,
        pdfUrl,
      });

      // 4) Journalisation (best-effort : n'interrompt jamais l'envoi).
      try {
        await supabase.from('whatsapp_sent_log').insert({
          reservation_id: params.reservation.id,
          client_name: clientName,
          phone,
          document_type: params.documentType,
          language: params.templateLang,
          pdf_url: pdfUrl,
        });
      } catch (logErr) {
        console.warn('whatsapp_sent_log insert failed (ignored):', logErr);
      }

      return {
        success: true,
        message:
          params.templateLang === 'fr'
            ? 'Lien WhatsApp prêt'
            : 'رابط واتساب جاهز',
        waLink,
        pdfUrl,
      };
    } catch (error: any) {
      console.error('Error preparing WhatsApp document:', error);
      return {
        success: false,
        message: error.message || 'Échec de la préparation du document WhatsApp',
      };
    }
  }
}
