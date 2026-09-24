const nodemailer = require("nodemailer");

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null; // pas configuré
  }
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

function messageRetenu(candidat) {
  return `Bonjour ${candidat.prenom} ${candidat.nom},

Nous avons le plaisir de vous informer que votre candidature vidéo à School Voice 2027 (zone ${candidat.zone}) a été RETENUE à l'issue de la présélection !

Vous êtes invité(e) à vous rendre disponible et à rester à l'écoute pour passer le casting en présentiel, prévu en décembre. La date exacte et le lieu précis vous seront communiqués ultérieurement sur le forum WhatsApp dédié à School Voice.

Merci pour votre talent et votre engagement. Nous avons hâte de vous entendre sur scène !

L'équipe d'organisation
School Voice 2027 — Hermosa Vida Voice
« Une Voix Peut Changer Une Vie »`;
}

function messageNonRetenu(candidat) {
  return `Bonjour ${candidat.prenom} ${candidat.nom},

Nous vous remercions vivement d'avoir participé à la présélection vidéo de School Voice 2027 (zone ${candidat.zone}).

Après analyse de votre vidéo, nous sommes au regret de vous informer que votre candidature n'a pas été retenue pour cette étape du concours.

Nous saluons votre courage et votre engagement, et vous encourageons à continuer à travailler votre talent. Nous espérons vous retrouver pour une prochaine édition de School Voice.

Merci encore pour votre participation.

L'équipe d'organisation
School Voice 2027 — Hermosa Vida Voice
« Une Voix Peut Changer Une Vie »`;
}

async function envoyerStatutParEmail(candidat) {
  const t = getTransporter();
  if (!t) {
    return { ok: false, raison: "Email non configuré (GMAIL_USER / GMAIL_APP_PASSWORD manquants dans .env)" };
  }
  const sujet =
    candidat.statut === "retenu"
      ? "School Voice 2027 — Votre candidature a été retenue !"
      : "School Voice 2027 — Résultat de votre candidature";
  const texte = candidat.statut === "retenu" ? messageRetenu(candidat) : messageNonRetenu(candidat);

  await t.sendMail({
    from: `"${process.env.FROM_NAME || "School Voice 2027"}" <${process.env.GMAIL_USER}>`,
    to: candidat.email,
    subject: sujet,
    text: texte,
  });
  return { ok: true };
}

module.exports = { envoyerStatutParEmail, messageRetenu, messageNonRetenu };
