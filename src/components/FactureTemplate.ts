import { ReservationDetails } from '../types';
import { goldPrintOverrideCSS } from './printTheme';

/**
 * Gabarit unique de la FACTURE (habillage OR & NOIR, mentions légales du
 * décret 05-468).
 *
 * Un seul générateur sert désormais :
 *  - l'aperçu et l'impression (modale « Imprimer » du planning / réservations),
 *  - la pièce jointe PDF envoyée par email (modale « Envoyer par email » et
 *    bouton « Envoyer » de la modale d'impression).
 *
 * Toute évolution du design se fait ici et se répercute partout.
 */

/** Force une valeur latine/numérique à s'afficher strictement de gauche à droite. */
const ltr = (value: any): string =>
  `<span dir="ltr" style="unicode-bidi:bidi-override;direction:ltr;display:inline-block">${value ?? ''}</span>`;

/** Formate une date ISO (`AAAA-MM-JJ`) en `JJ/MM/AAAA` ; renvoie la valeur brute si illisible. */
const formatDateFR = (value?: string): string => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR');
};

/** Convertit un entier (0 -> 999 999 999) en toutes lettres francaises. */
export const numberToFrenchWords = (value: number): string => {
  const n = Math.floor(Math.abs(Number(value) || 0));
  if (n === 0) return 'zéro';
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const below100 = (x: number): string => {
    if (x < 20) return units[x];
    const t = Math.floor(x / 10);
    const u = x % 10;
    if (t === 7 || t === 9) {
      if (t === 7 && u === 1) return 'soixante et onze';
      return tens[t] + '-' + units[10 + u];
    }
    if (u === 0) return t === 8 ? 'quatre-vingts' : tens[t];
    if (u === 1 && t >= 2 && t <= 6) return tens[t] + ' et un';
    return tens[t] + '-' + units[u];
  };

  const below1000 = (x: number): string => {
    const h = Math.floor(x / 100);
    const rem = x % 100;
    let str = '';
    if (h > 0) {
      str = h === 1 ? 'cent' : units[h] + ' cent';
      if (rem === 0 && h > 1) str += 's';
    }
    if (rem > 0) str = str ? str + ' ' + below100(rem) : below100(rem);
    return str;
  };

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  let result = '';
  if (millions > 0) result += millions === 1 ? 'un million' : below1000(millions) + ' millions';
  if (thousands > 0) result += (result ? ' ' : '') + (thousands === 1 ? 'mille' : below1000(thousands) + ' mille');
  if (rest > 0) result += (result ? ' ' : '') + below1000(rest);
  return result.trim();
};

/** Montant en toutes lettres pour une facture (dinars algériens + centimes), en MAJUSCULES. */
export const amountInWordsDZD = (amount: number): string => {
  const abs = Math.abs(Number(amount) || 0);
  const dinars = Math.floor(abs);
  const centimes = Math.round((abs - dinars) * 100);
  let words = `${numberToFrenchWords(dinars)} dinar${dinars > 1 ? 's' : ''} algérien${dinars > 1 ? 's' : ''}`;
  if (centimes > 0) words += ` et ${numberToFrenchWords(centimes)} centime${centimes > 1 ? 's' : ''}`;
  return words.toUpperCase();
};

/** Informations « société » recopiées sur la facture quand le client est une entreprise. */
export interface FactureSociete {
  entreprise?: string; conducteur?: string; rc?: string; art?: string; nis?: string; nif?: string;
  email?: string; address?: string; city?: string; bp?: string; phone?: string; fax?: string;
  formeJuridique?: string; activite?: string; capital?: string;
}

export interface FactureOptions {
  /** Ligne `website_settings` de l'agence (nom, logo, RC, NIF, NIS, ART, banque...). */
  agency?: any;
  /** Renseigné uniquement pour une facturation société. */
  societe?: FactureSociete | null;
  /** Espèces, Virement, Chèque, Carte... */
  paymentMode?: string;
  /** N° de facture personnalisé ; dérivé de la réservation si vide. */
  factureNumber?: string;
  /**
   * Date d'échéance du règlement (`AAAA-MM-JJ`). Vide = date de début de la
   * location (date de départ du véhicule).
   */
  dueDate?: string;
}

/** Charge la ligne de paramètres de l'agence utilisée par la facture. */
export const loadFactureAgency = async (supabaseClient: any): Promise<any> => {
  try {
    const { data } = await supabaseClient
      .from('website_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    return data || {};
  } catch {
    return {};
  }
};

/**
 * Construit le HTML complet (document autonome, prêt à imprimer ou à convertir
 * en PDF) de la facture.
 */
export const buildFactureHTML = (
  reservation: ReservationDetails,
  options: FactureOptions = {},
): string => {
  const { agency, societe, paymentMode, factureNumber, dueDate } = options;
  const subtotal = reservation.totalPrice || 0;
  const tvaAmount = reservation.tvaApplied ? subtotal * 0.19 : 0;
  const timbre = 200;
  const total = subtotal + tvaAmount + timbre;
  const departDate = reservation?.step1?.departureDate || '';
  const returnDate = reservation?.step1?.returnDate || '';
  // Échéance : par défaut la date de début de la location.
  const dueDateValue = (dueDate && dueDate.trim()) || departDate;
  const dueDateLabel = formatDateFR(dueDateValue) || '—';
  const days = reservation?.totalDays || 0;
  const pricePerDay = (reservation?.car as any)?.priceDay || (reservation?.car as any)?.price_per_day || 0;

  const a: any = agency || {};
  const today = new Date().toLocaleDateString('fr-FR');
  const factNo = (factureNumber && factureNumber.trim())
    ? factureNumber.trim()
    : `${reservation?.id ? reservation.id.toString().substring(0, 6).toUpperCase() : '000000'}/${new Date().getFullYear()}`;
  const ref = reservation?.id ? reservation.id.toString().substring(0, 4).toUpperCase() : '0001';

  // Ligne clé/valeur : n'est rendue que si la valeur existe.
  const kv = (label: string, value: any, ltrValue = false) =>
    value ? `<div class="kv"><span class="kv-k">${label}</span><span class="kv-v">${ltrValue ? ltr(value) : value}</span></div>` : '';
  // Badge identifiant légal (RC / NIF / NIS / ART) — rendu seulement si présent.
  const idBadge = (label: string, value: any) =>
    value ? `<div class="id-badge"><span class="id-k">${label}</span><span class="id-v">${ltr(value)}</span></div>` : '';

  // ── FOURNISSEUR (agence) ──
  const agencyName = a.name || 'NOM DE L’AGENCE';
  const agencyIdBadges = [
    idBadge('RC', a.rc), idBadge('ART/BP', a.art), idBadge('NIF', a.nif), idBadge('NIS', a.nis),
  ].join('');
  const agencyAddress = [a.address, a.city].filter(Boolean).join(', ');
  const agencyPhones = [a.phone, a.phone_number_2].filter(Boolean).map((p: string) => ltr(p)).join(' / ');
  // Bandeau de contact affiché sous le nom de l'agence, en tête de facture.
  const headerContact = [
    agencyAddress ? `<span><i>\u{1F4CD}</i>${agencyAddress}</span>` : '',
    agencyPhones ? `<span><i>\u{260E}</i>${agencyPhones}</span>` : '',
    a.fax ? `<span><i>\u{1F4E0}</i>${ltr(a.fax)}</span>` : '',
    a.email ? `<span><i>\u{2709}</i>${a.email}</span>` : '',
  ].filter(Boolean).join('');
  // Coordonnées bancaires : encart en haut à droite, sous le titre.
  const bankRows = [
    a.bank_name ? `<div class="brow"><b>Banque :</b> ${a.bank_name}</div>` : '',
    a.bank_number ? `<div class="brow"><b>Compte / RIB :</b> ${ltr(a.bank_number)}</div>` : '',
  ].filter(Boolean).join('');

  const agencyBody = [
    kv('Forme juridique', a.forme_juridique),
    kv('Activité', a.activite),
    kv('Capital', a.capital),
    kv('Adresse', [a.address, a.city].filter(Boolean).join(', ')),
    kv('Téléphone', [a.phone, a.phone_number_2].filter(Boolean).map((p: string) => ltr(p)).join(' / ')),
    kv('Fax', a.fax, true),
    kv('Email', a.email),
  ].join('');

  // ── CLIENT (société ou particulier) ──
  const isSoc = !!societe;
  const clientName = isSoc
    ? (societe!.entreprise || `${reservation?.client?.firstName || ''} ${reservation?.client?.lastName || ''}`.trim())
    : `${reservation?.client?.firstName || ''} ${reservation?.client?.lastName || ''}`.trim() || 'Client';
  const clientIdBadges = isSoc
    ? [idBadge('RC', societe!.rc), idBadge('ART/BP', societe!.art), idBadge('NIF', societe!.nif), idBadge('NIS', societe!.nis)].join('')
    : '';
  const clientBody = isSoc
    ? [
        kv('Forme juridique', societe!.formeJuridique),
        kv('Activité', societe!.activite),
        kv('Conducteur société', societe!.conducteur),
        kv('Adresse', [societe!.address, societe!.city].filter(Boolean).join(', ') || reservation?.client?.completeAddress || reservation?.client?.wilaya),
        kv('Boîte postale', societe!.bp, true),
        kv('Téléphone', societe!.phone || reservation?.client?.phone, true),
        kv('Fax', societe!.fax, true),
        kv('Email', societe!.email),
      ].join('')
    : [
        kv('Adresse', reservation?.client?.completeAddress || reservation?.client?.wilaya),
        kv('Téléphone', reservation?.client?.phone, true),
        kv('N° CIN', reservation?.client?.idCardNumber, true),
        kv('N° Permis', (reservation?.client as any)?.licenseNumber, true),
      ].join('');

  const clientTitle = isSoc ? 'Client — Société (Locataire)' : 'Client (Locataire)';

  const html = `
  <!DOCTYPE html>
  <html dir="ltr" lang="fr">
  <head>
    <meta charset="UTF-8">
    <title>Facture ${factNo}</title>
    <style>
      ${goldPrintOverrideCSS(false)}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      :root { --or: #B8912E; --or-2: #C8A13C; --noir: #14130E; --line: #e6ddc7; --soft: #fbf7ee; }
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.45; color: #1a1a1a; background: #f5f5f5;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .page { width: 210mm; min-height: 297mm; padding: 10mm 11mm; margin: 10px auto; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,.1); display: flex; flex-direction: column; }

      /* EN-TÊTE : identité de l'agence à gauche, titre + banque à droite */
      .fx-top { display: grid; grid-template-columns: 1.4fr 1fr; gap: 9px; align-items: stretch; }
      .fx-ident { display: flex; flex-direction: column; border: 2px solid var(--noir); border-radius: 10px; overflow: hidden; }
      .fx-brand { display: flex; align-items: center; gap: 13px; padding: 11px 14px; background: linear-gradient(135deg, var(--noir), #2a271d); color: #fff; }
      .fx-logo { width: 58px; height: 58px; object-fit: contain; background: #fff; border: 2px solid var(--or); border-radius: 8px; padding: 3px; flex-shrink: 0; }
      .fx-logo-ph { width: 58px; height: 58px; border: 2px solid var(--or); border-radius: 8px; background: var(--or); display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; }
      .fx-brand-name { font-size: 19px; font-weight: 900; letter-spacing: .3px; color: var(--or-2); line-height: 1.2; }
      .fx-brand-sub { font-size: 9.5px; text-transform: uppercase; letter-spacing: 2px; color: #d8cba6; margin-top: 3px; }
      .fx-contact { flex: 1; display: flex; flex-wrap: wrap; align-content: center; gap: 3px 14px; padding: 7px 14px; background: var(--soft); border-top: 2px solid var(--or); font-size: 10.5px; color: #3a3524; }
      .fx-contact i { font-style: normal; font-weight: 800; color: var(--or); margin-right: 4px; }
      .fx-aside { display: flex; flex-direction: column; gap: 9px; }
      .fx-title { border: 2px solid var(--or); border-radius: 10px; background: var(--or); color: #fff; padding: 9px 10px; text-align: center; }
      .fx-title b { display: block; font-size: 21px; font-weight: 900; letter-spacing: 4px; }
      .fx-title span { font-size: 10px; letter-spacing: 1px; opacity: .92; }
      .fx-bank { flex: 1; border: 1.5px solid var(--or); border-radius: 10px; background: var(--soft); padding: 7px 11px 8px; }
      .fx-bank .bt { display: flex; align-items: center; gap: 5px; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: var(--or); border-bottom: 1px solid var(--line); padding-bottom: 4px; margin-bottom: 5px; }
      .fx-bank .brow { font-size: 10.5px; margin: 2px 0; color: #2a2a2a; word-break: break-word; }
      .fx-bank .brow b { color: #8a6d1f; font-weight: 700; }
      .fx-bank .bempty { font-size: 10px; font-style: italic; color: #9a927e; }

      /* META BAR */
      .fx-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
      .fx-meta .cell { border: 1px solid var(--line); border-left: 3px solid var(--or); border-radius: 6px; padding: 6px 10px; background: var(--soft); }
      .fx-meta .k { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #8a6d1f; }
      .fx-meta .v { font-size: 13px; font-weight: 700; color: var(--noir); margin-top: 1px; }

      /* PARTIES */
      .fx-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
      .party { border: 1.5px solid var(--or); border-radius: 8px; overflow: hidden; background: #fff; }
      .party-h { background: linear-gradient(135deg, var(--noir), #2a271d); color: #fff; padding: 7px 12px; display: flex; align-items: center; gap: 8px; }
      .party-h .p-ic { width: 22px; height: 22px; border-radius: 50%; background: var(--or); display: flex; align-items: center; justify-content: center; font-size: 12px; }
      .party-h .p-t { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: var(--or-2); }
      .party-b { padding: 9px 12px; }
      .party-name { font-size: 14px; font-weight: 800; color: var(--noir); margin-bottom: 6px; }
      .id-badges { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 7px; }
      .id-badge { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 5px; padding: 3px 7px; background: var(--soft); min-width: 0; }
      .id-k { font-size: 8px; font-weight: 800; color: var(--or); text-transform: uppercase; letter-spacing: .5px; }
      .id-v { font-size: 11px; font-weight: 700; color: var(--noir); }
      .kv { display: flex; gap: 6px; font-size: 11.5px; margin: 2px 0; }
      .kv-k { font-weight: 700; color: #8a6d1f; min-width: 92px; flex-shrink: 0; }
      .kv-v { color: #1a1a1a; word-break: break-word; }

      /* ITEMS */
      .fx-items { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11.5px; border: 1.5px solid var(--noir); border-radius: 6px; overflow: hidden; }
      .fx-items th { background: var(--noir); color: var(--or-2); padding: 8px 6px; text-align: center; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; border: 1px solid #2a271d; }
      .fx-items td { border: 1px solid var(--line); padding: 8px 6px; text-align: center; vertical-align: middle; }
      .fx-items td.left { text-align: left; padding-left: 10px; font-weight: 700; }
      .fx-items tbody tr:nth-child(even) { background: var(--soft); }

      /* BOTTOM */
      .fx-bottom { display: grid; grid-template-columns: 1.25fr 1fr; gap: 10px; margin-top: 10px; align-items: start; }
      .fx-bottom-left { display: flex; flex-direction: column; gap: 10px; }
      .fx-words { border: 1.5px solid var(--or); border-radius: 8px; padding: 10px 12px; background: var(--soft); }
      .fx-words .lab { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--or); margin-bottom: 4px; }
      .fx-words .val { font-size: 12px; font-weight: 700; color: var(--noir); font-style: italic; }
      .fx-totals { border: 1.5px solid var(--noir); border-radius: 8px; overflow: hidden; }
      .fx-totals table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .fx-totals td { padding: 7px 12px; border-bottom: 1px solid var(--line); }
      .fx-totals td:first-child { font-weight: 700; color: #8a6d1f; }
      .fx-totals td:last-child { text-align: right; font-weight: 700; color: var(--noir); }
      .fx-totals tr.grand td { background: var(--or); color: #fff; font-size: 14px; font-weight: 900; border-bottom: none; }

      /* PIED : signatures client & agence */
      .fx-footer { margin-top: 12px; border-top: 2px solid var(--or); padding-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: stretch; }
      /* Échéance : encart placé juste sous le montant en toutes lettres */
      .fx-due { border: 1.5px solid var(--or); border-left: 4px solid var(--or); border-radius: 8px; background: var(--soft); padding: 8px 11px; }
      .fx-due .dk { font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: var(--or); }
      .fx-due .dv { font-size: 15px; font-weight: 900; color: var(--noir); margin-top: 3px; }
      .fx-due .dn { font-size: 9px; color: #7a7360; margin-top: 3px; }
      .fx-sign { display: flex; flex-direction: column; border: 1.5px solid var(--line); border-radius: 8px; padding: 7px 10px 8px; text-align: center; }
      .fx-sign .st { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: var(--or); }
      .fx-sign .sl { flex: 1; min-height: 40px; border-bottom: 1px solid var(--noir); margin: 4px 6px 5px; }
      .fx-sign .sn { font-size: 9px; font-weight: 700; color: #7a7360; }
      .fx-spacer { flex: 1; }

      @media print {
        @page { size: A4; margin: 0; }
        html, body { width: 210mm; margin: 0; padding: 0; background: #fff; }
        .page { margin: 0 auto; width: 210mm; min-height: 297mm; box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <div class="page">

      <!-- EN-TÊTE : agence (gauche) · titre + coordonnées bancaires (droite) -->
      <div class="fx-top">
        <div class="fx-ident">
          <div class="fx-brand">
            ${a.logo ? `<img src="${a.logo}" alt="Logo" class="fx-logo">` : '<div class="fx-logo-ph">\u{1F3E2}</div>'}
            <div>
              <div class="fx-brand-name">${agencyName}</div>
              <div class="fx-brand-sub">${a.activite || 'Location de véhicules'}</div>
            </div>
          </div>
          <div class="fx-contact">${headerContact}</div>
        </div>
        <div class="fx-aside">
          <div class="fx-title"><b>FACTURE</b><span>الفاتورة</span></div>
          <div class="fx-bank">
            <div class="bt"><span>\u{1F3E6}</span> Coordonnées bancaires</div>
            ${bankRows || '<div class="bempty">À renseigner dans les paramètres de l’agence.</div>'}
          </div>
        </div>
      </div>

      <!-- META -->
      <div class="fx-meta">
        <div class="cell"><div class="k">N° Facture</div><div class="v">${ltr(factNo)}</div></div>
        <div class="cell"><div class="k">Faite le</div><div class="v">${today}</div></div>
        <div class="cell"><div class="k">Mode de paiement</div><div class="v">${paymentMode || '—'}</div></div>
      </div>

      <!-- PARTIES -->
      <div class="fx-parties">
        <div class="party">
          <div class="party-h"><span class="p-ic">\u{1F3E2}</span><span class="p-t">Fournisseur (Agence)</span></div>
          <div class="party-b">
            <div class="party-name">${agencyName}</div>
            ${agencyIdBadges ? `<div class="id-badges">${agencyIdBadges}</div>` : ''}
            ${agencyBody}
          </div>
        </div>
        <div class="party">
          <div class="party-h"><span class="p-ic">${isSoc ? '\u{1F4BC}' : '\u{1F464}'}</span><span class="p-t">${clientTitle}</span></div>
          <div class="party-b">
            <div class="party-name">${clientName}</div>
            ${clientIdBadges ? `<div class="id-badges">${clientIdBadges}</div>` : ''}
            ${clientBody}
          </div>
        </div>
      </div>

      <!-- ITEMS -->
      <table class="fx-items">
        <thead>
          <tr>
            <th>Réf</th><th>Marque / Désignation</th><th>Immatricule</th>
            <th>Du</th><th>Au</th><th>Nb jours</th><th>Prix unitaire</th><th>Montant HT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${ref}</td>
            <td class="left">${ltr((reservation?.car?.brand || '') + ' ' + (reservation?.car?.model || ''))}</td>
            <td>${ltr((reservation?.car as any)?.registration || (reservation?.car as any)?.plate_number || 'N/A')}</td>
            <td>${formatDateFR(departDate) || departDate}</td>
            <td>${formatDateFR(returnDate) || returnDate}</td>
            <td>${days}</td>
            <td>${pricePerDay.toLocaleString('fr-FR')} DA</td>
            <td>${subtotal.toLocaleString('fr-FR')} DA</td>
          </tr>
        </tbody>
      </table>

      <!-- BAS DE FACTURE : montant en lettres + échéance, puis totaux -->
      <div class="fx-bottom">
        <div class="fx-bottom-left">
          <div class="fx-words">
            <div class="lab">Arrêtée la présente facture à la somme de :</div>
            <div class="val">${amountInWordsDZD(total)}</div>
          </div>
          <div class="fx-due">
            <div class="dk">Date d’échéance</div>
            <div class="dv">${ltr(dueDateLabel)}</div>
            <div class="dn">Règlement exigible à cette date.</div>
          </div>
        </div>
        <div class="fx-totals">
          <table>
            <tr><td>Total HT</td><td>${subtotal.toLocaleString('fr-FR')} DA</td></tr>
            <tr><td>TVA (19%)</td><td>${tvaAmount.toLocaleString('fr-FR')} DA</td></tr>
            <tr><td>Timbre</td><td>${timbre.toLocaleString('fr-FR')} DA</td></tr>
            <tr class="grand"><td>Total à payer</td><td>${total.toLocaleString('fr-FR')} DA</td></tr>
          </table>
        </div>
      </div>

      <div class="fx-spacer"></div>

      <!-- PIED : signatures client & agence -->
      <div class="fx-footer">
        <div class="fx-sign">
          <div class="st">Signature du client</div>
          <div class="sl"></div>
          <div class="sn">Lu et approuvé</div>
        </div>
        <div class="fx-sign">
          <div class="st">Cachet &amp; Signature</div>
          <div class="sl"></div>
          <div class="sn">${agencyName}</div>
        </div>
      </div>

    </div>
  </body>
  </html>
  `;
  return html;
};
