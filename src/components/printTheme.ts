/**
 * Habillage « OR & NOIR » commun à TOUS les documents imprimés
 * (contrat, devis, facture, engagement, reçu…).
 *
 * Renvoie un bloc CSS à injecter juste après l'ouverture de la balise
 * <style> de chaque générateur. Toutes les règles sont en `!important` :
 * elles ré-habillent les classes existantes (en-têtes bleus/verts/orange…)
 * sans qu'il faille réécrire chaque gabarit, et garantissent une identité
 * visuelle unique — texte en gras, deux teintes seulement (or + noir chaud),
 * logo plus grand et nom de l'agence en or.
 *
 * @param compact  true quand le document est dense (conducteur secondaire /
 *                 société sur le contrat) : le logo et le titre restent un peu
 *                 plus mesurés pour tenir sur une seule page A4.
 */
export function goldPrintOverrideCSS(compact = false): string {
  const logo = compact ? 54 : 68;
  const agencyName = compact ? 26 : 32;

  return `
    /* ═══════════════ HABILLAGE OR & NOIR (bichromie stricte) ═══════════════ */
    :root { --gold:#B8912E; --gold-bright:#C8A13C; --gold-deep:#8A6A16; --ink:#14130E; --cream:#FBF7EA; --cream-2:#F6ECCB; --line:#E4D8B0; }

    body { color:#14130E !important; }
    .page { border-color:#14130E !important; }

    /* En-tête : logo plus grand + cerclé d'or, nom de l'agence en OR */
    .header { border-bottom:3px solid #B8912E !important; }
    .logo, .logo-placeholder {
      width:${logo}px !important; height:${logo}px !important;
      object-fit:contain !important; background:#FFFFFF !important;
      border:2px solid #B8912E !important; border-radius:10px !important;
      padding:3px !important; box-shadow:0 2px 7px rgba(184,145,46,0.35) !important;
    }
    .agency-name {
      color:#B8912E !important; font-size:${agencyName}px !important;
      font-weight:800 !important; letter-spacing:0.4px !important;
    }
    .agency-name-sm { color:#8A6A16 !important; font-weight:800 !important; }
    .contract-title, .devis-title, .invoice-title, .engagement-title,
    .recu-title, .inspection-title {
      color:#8A6A16 !important; font-weight:800 !important;
    }
    .agency-contact, .agency-contact-item, .agency-detail, .strip-value { color:#302C21 !important; }

    /* Bandeaux / encadrés d'information : crème doré, liseré or */
    .info-box, .info-box.blue, .info-box.green, .info-box.amber, .info-box.orange, .info-box.purple,
    .meta-box, .info-field, .agency-strip {
      background:#FBF7EA !important; border-left:4px solid #B8912E !important;
    }
    .meta-box { border-left-width:3px !important; }
    .info-label, .info-value, .meta-value, .info-field-value, .strip-value { color:#14130E !important; }
    .meta-label, .info-field-label, .strip-label { color:#8A6A16 !important; }

    /* Sections & titres de section */
    .section, .section.driver-section, .section.vehicle-section, .section.pricing-section,
    .section.conditions-section, .section.inspection-section, .info-section, .document-info, .vehicle-section,
    .payment-box, .payment-section, .notes-section, .checklist, .signature-section, .details-grid {
      background:#FCFAF2 !important; border-color:#E4D8B0 !important;
    }
    .section-title, .sec-title, .notes-title, .checklist-title {
      background:#F6ECCB !important; color:#14130E !important;
      border-left:4px solid #B8912E !important; border-bottom-color:#B8912E !important;
    }
    .detail-label, .payment-item .detail-label { color:#8A6A16 !important; }
    .detail-value, .notes-text { color:#14130E !important; }
    .check-box { border-color:#8A6A16 !important; }

    /* Champs */
    .field { border-bottom-color:#E4D8B0 !important; }
    .field-label { color:#8A6A16 !important; }
    .field-value { color:#14130E !important; }

    /* Tableaux (véhicule / inspection / articles) */
    .vehicle-table, .inspection-table, .items-table, .totals-table, .pricing-summary, .pricing-table {
      border-color:#B8912E !important;
    }
    .vehicle-table th, .inspection-table th, .items-table th {
      background:#F6ECCB !important; color:#14130E !important; border-color:#B8912E !important;
    }
    .vehicle-table td, .inspection-table td { background:#FCFAF2 !important; color:#14130E !important; }
    .items-table td { color:#14130E !important; }
    .items-table tbody tr:nth-child(odd) { background:#FCFAF2 !important; }

    /* Totaux / lignes de prix */
    .pricing-value, .pricing-label { color:#14130E !important; }
    .pricing-row.total { border-color:#14130E !important; }
    .pricing-row.grand-total { color:#14130E !important; background:#F6ECCB !important; border-top:2px solid #B8912E !important; }
    .totals-table tr td:first-child { background:#FBF7EA !important; color:#8A6A16 !important; }
    .totals-table tr.grand-total td { background:#B8912E !important; color:#14130E !important; border-color:#B8912E !important; }
    .validity-note { color:#8A6A16 !important; border-top-color:#E4D8B0 !important; }

    /* Société / entreprise */
    .societe-card, .societe-block {
      background:#FBF7EA !important; border-color:#B8912E !important; border-left:4px solid #B8912E !important;
    }
    .societe-header { border-bottom-color:#E4D8B0 !important; }
    .societe-header-icon { background:#B8912E !important; }
    .societe-card-title, .societe-title { color:#8A6A16 !important; }
    .societe-subtitle { color:#6C5413 !important; }
    .societe-card-label, .societe-field-label { color:#8A6A16 !important; }
    .societe-card-value, .societe-field-value { color:#14130E !important; }
    .societe-field { background:#FFFFFF !important; border-color:#E4D8B0 !important; border-left:3px solid #B8912E !important; }

    /* Engagement : phrases mises en avant */
    .highlight { color:#8A6A16 !important; }
    .intro-line, .info-value, .content { color:#14130E !important; }

    /* Conditions / mentions */
    .terms-section { background:#FBF7EA !important; border-color:#B8912E !important; color:#302C21 !important; }
    .checkbox { border-color:#8A6A16 !important; }

    /* Signatures */
    .signature-line { border-top-color:#14130E !important; }
    .signature-label { color:#14130E !important; }
    .date-sig { color:#6C5413 !important; }

    /* Tout le texte en GRAS (demande : contrat entièrement en gras). Le bloc
       d'emphase ci-dessous (même spécificité, déclaré après) repasse à 800. */
    .page * { font-weight:700 !important; }
    .agency-name, .contract-title, .devis-title, .invoice-title, .engagement-title,
    .recu-title, .inspection-title, .notes-title, .checklist-title,
    .section-title, .sec-title, .societe-title, .card-title, .signature-label,
    .pricing-row.grand-total, .pricing-row.total, .totals-table tr.grand-total td,
    .vehicle-table th, .inspection-table th, .items-table th, .agency-name-sm {
      font-weight:800 !important;
    }
  `;
}
