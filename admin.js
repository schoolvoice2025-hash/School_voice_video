const express = require("express");
const db = require("../db/database");
const ZONES = require("../config/zones");
const { exigerAuthAdmin } = require("../middleware/auth");
const { envoyerStatutParEmail } = require("../services/email");
const { envoyerStatutParWhatsApp, lienWhatsApp } = require("../services/whatsapp");

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("admin/login", { erreur: null });
});

router.post("/login", (req, res) => {
  if (req.body.motdepasse === process.env.ADMIN_PASSWORD) {
    req.session.estAdmin = true;
    return res.redirect("/admin");
  }
  res.render("admin/login", { erreur: "Mot de passe incorrect." });
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

router.get("/", exigerAuthAdmin, (req, res) => {
  const zoneFiltre = req.query.zone || "";
  const statutFiltre = req.query.statut || "";

  let sql = "SELECT * FROM candidatures WHERE 1=1";
  const params = [];
  if (zoneFiltre) { sql += " AND zone = ?"; params.push(zoneFiltre); }
  if (statutFiltre) { sql += " AND statut = ?"; params.push(statutFiltre); }
  sql += " ORDER BY date_soumission DESC";

  const candidatures = db.prepare(sql).all(...params);
  const total = db.prepare("SELECT COUNT(*) c FROM candidatures").get().c;
  const enAttente = db.prepare("SELECT COUNT(*) c FROM candidatures WHERE statut = 'en_attente'").get().c;
  const retenus = db.prepare("SELECT COUNT(*) c FROM candidatures WHERE statut = 'retenu'").get().c;
  const nonRetenus = db.prepare("SELECT COUNT(*) c FROM candidatures WHERE statut = 'non_retenu'").get().c;

  res.render("admin/dashboard", {
    candidatures, zones: ZONES, zoneFiltre, statutFiltre,
    stats: { total, enAttente, retenus, nonRetenus },
    lienWhatsApp,
  });
});

router.get("/candidat/:id", exigerAuthAdmin, (req, res) => {
  const candidat = db.prepare("SELECT * FROM candidatures WHERE id = ?").get(req.params.id);
  if (!candidat) return res.redirect("/admin");
  res.render("admin/candidat", { candidat, lienWhatsAppUrl: lienWhatsApp(candidat), info: req.query.info || null });
});

router.post("/candidat/:id/statut", exigerAuthAdmin, async (req, res) => {
  const { statut, note_admin } = req.body;
  if (!["retenu", "non_retenu", "en_attente"].includes(statut)) {
    return res.redirect("/admin");
  }

  db.prepare(`
    UPDATE candidatures
    SET statut = ?, note_admin = ?, date_traitement = datetime('now')
    WHERE id = ?
  `).run(statut, note_admin || null, req.params.id);

  const candidat = db.prepare("SELECT * FROM candidatures WHERE id = ?").get(req.params.id);
  let messageRetour = "Statut enregistré.";

  if (statut === "retenu" || statut === "non_retenu") {
    // Email
    try {
      const resEmail = await envoyerStatutParEmail(candidat);
      if (resEmail.ok) {
        db.prepare("UPDATE candidatures SET email_envoye = 1 WHERE id = ?").run(candidat.id);
        messageRetour += " Email envoyé.";
      } else {
        messageRetour += ` Email NON envoyé (${resEmail.raison}).`;
      }
    } catch (e) {
      messageRetour += ` Erreur email : ${e.message}`;
    }

    // WhatsApp automatique si configuré (sinon le bouton manuel reste disponible sur la fiche)
    try {
      const resWa = await envoyerStatutParWhatsApp(candidat);
      if (resWa.ok) {
        db.prepare("UPDATE candidatures SET whatsapp_envoye = 1 WHERE id = ?").run(candidat.id);
        messageRetour += " WhatsApp envoyé automatiquement.";
      }
    } catch (e) {
      // silencieux : le lien manuel reste toujours disponible
    }
  }

  res.redirect(`/admin/candidat/${req.params.id}?info=${encodeURIComponent(messageRetour)}`);
});

router.post("/candidat/:id/whatsapp-envoye", exigerAuthAdmin, (req, res) => {
  db.prepare("UPDATE candidatures SET whatsapp_envoye = 1 WHERE id = ?").run(req.params.id);
  res.redirect(`/admin/candidat/${req.params.id}`);
});

module.exports = router;
