// @ts-nocheck - Vercel runtime types
//
// Envoi AUTOMATIQUE d'un document (PDF) via l'API officielle WhatsApp Cloud
// (Meta / Graph API). 100 % compatible Vercel serverless : il s'agit d'un
// simple appel HTTPS, aucune session persistante n'est nécessaire.
//
// Le PDF est déjà hébergé publiquement (bucket Supabase "documents") : on
// envoie donc le document « par lien ».
//
// Deux modes :
//   1. Message modèle (template) — requis pour contacter un client qui n'a PAS
//      écrit à l'agence dans les dernières 24 h. Le template doit être approuvé
//      dans Meta Business Manager avec un en-tête de type DOCUMENT.
//   2. Message document simple — fonctionne dans la fenêtre de 24 h (le client
//      a déjà écrit à l'agence).
//
// Identifiants fournis par le frontend (stockés côté app dans whatsapp_settings).

export default async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
    res.status(200).send('ok');
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};

    // Les identifiants peuvent venir du corps de la requête (config dans l'app)
    // ou, en repli, des variables d'environnement Vercel.
    const phoneNumberId = payload.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = payload.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const graphVersion = payload.graphVersion || process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        success: false,
        error:
          'WhatsApp non configuré : Phone Number ID et Access Token manquants. Configurez-les dans Paramètres → WhatsApp.',
      });
    }

    // --- Mode TEST : vérifie que les identifiants sont valides sans envoyer ---
    if (payload.test) {
      const infoUrl = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating`;
      const infoResp = await fetch(infoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const infoData = await infoResp.json().catch(() => ({}));
      if (!infoResp.ok) {
        return res.status(502).json({
          success: false,
          error: `WhatsApp API: ${infoData?.error?.message || 'identifiants invalides'}`,
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Connexion WhatsApp valide',
        info: {
          verifiedName: infoData?.verified_name || null,
          displayPhoneNumber: infoData?.display_phone_number || null,
          qualityRating: infoData?.quality_rating || null,
        },
      });
    }

    const to = String(payload.to || '').replace(/\D/g, '');
    if (!to) {
      return res.status(400).json({ success: false, error: 'Numéro du destinataire (to) manquant.' });
    }

    if (!payload.pdfUrl) {
      return res.status(400).json({ success: false, error: 'Lien du PDF (pdfUrl) manquant.' });
    }

    const fileName = (payload.fileName || 'document.pdf').replace(/[^a-z0-9_.-]/gi, '_');
    const caption = payload.caption || '';

    // Construction du message WhatsApp
    let message;
    if (payload.templateName) {
      // --- Mode TEMPLATE (recommandé pour l'envoi aux clients) ---
      const components = [
        {
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: { link: payload.pdfUrl, filename: fileName },
            },
          ],
        },
      ];
      // Paramètre texte du corps (ex : nom du client) si le template en attend un.
      if (payload.templateBodyParam) {
        components.push({
          type: 'body',
          parameters: [{ type: 'text', text: String(payload.templateBodyParam) }],
        });
      }

      message = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: payload.templateName,
          language: { code: payload.templateLang || 'fr' },
          components,
        },
      };
    } else {
      // --- Mode DOCUMENT simple (fenêtre de 24 h) ---
      message = {
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: {
          link: payload.pdfUrl,
          filename: fileName,
          ...(caption ? { caption } : {}),
        },
      };
    }

    const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;

    const metaResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const data = await metaResponse.json().catch(() => ({}));

    if (!metaResponse.ok) {
      const metaErr = data?.error?.message || JSON.stringify(data);
      console.error('WhatsApp Cloud API error:', metaResponse.status, metaErr);
      return res.status(502).json({
        success: false,
        error: `WhatsApp API: ${metaErr}`,
        meta: data?.error || null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'WhatsApp envoyé',
      messageId: data?.messages?.[0]?.id || null,
      waId: data?.contacts?.[0]?.wa_id || null,
    });
  } catch (error) {
    console.error('send-whatsapp error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
