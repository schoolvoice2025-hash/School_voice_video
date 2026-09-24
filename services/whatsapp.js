const { messageRetenu, messageNonRetenu } = require("./email");

// Met un numéro au format international sans "+" ni espaces (ex: 22961234567)
function formaterNumero(numero) {
  return String(numero).replace(/[^\d]/g, "");
}

function texteMessage(candidat) {
  return candidat.statut === "retenu" ? messageRetenu(candidat) : messageNonRetenu(candidat);
}

// Lien de secours : ouvre WhatsApp avec le message pré-rempli, à envoyer manuellement en un clic.
// Fonctionne TOUJOURS, sans aucune configuration ni compte API.
function lienWhatsApp(candidat) {
  const numero = formaterNumero(candidat.whatsapp);
  const texte = encodeURIComponent(texteMessage(candidat));
  return `https://wa.me/${numero}?text=${texte}`;
}

// Envoi automatique via l'API Cloud WhatsApp (Meta). Nécessite WHATSAPP_TOKEN et
// WHATSAPP_PHONE_NUMBER_ID dans .env (voir README pour la procédure de création).
// IMPORTANT : l'API Cloud WhatsApp n'autorise l'envoi d'un message texte libre que si le
// candidat vous a déjà écrit dans les 24h précédentes ; sinon il faut un "template" WhatsApp
// pré-approuvé par Meta. Tant que ce n'est pas mis en place, utilisez le lien de secours
// ci-dessus (bouton "Envoyer sur WhatsApp" dans l'admin), qui fonctionne sans restriction.
async function envoyerStatutParWhatsApp(candidat) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    return { ok: false, raison: "API WhatsApp non configurée — utilisez le lien manuel.", lien: lienWhatsApp(candidat) };
  }

  const numero = formaterNumero(candidat.whatsapp);
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: numero,
      type: "text",
      text: { body: texteMessage(candidat) },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, raison: `Échec API WhatsApp : ${err}`, lien: lienWhatsApp(candidat) };
  }
  return { ok: true };
}

module.exports = { envoyerStatutParWhatsApp, lienWhatsApp, texteMessage };
