const express = require("express");
const db = require("../db/database");
const ZONES = require("../config/zones");
const { exigerAuthAdmin } = require("../middleware/auth");
const { envoyerStatutParEmail } = require("../services/email");
const {
  envoyerStatutParWhatsApp,
  lienWhatsApp,
} = require("../services/whatsapp");

const router = express.Router();

// =========================
// CONNEXION ADMIN
// =========================

router.get("/login", (req, res) => {
  res.render("admin/login", { erreur: null });
});

router.post("/login", (req, res) => {
  if (req.body.motdepasse === process.env.ADMIN_PASSWORD) {
    req.session.estAdmin = true;
    return res.redirect("/admin");
  }

  res.render("admin/login", {
    erreur: "Mot de passe incorrect.",
  });
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

// =========================
// TABLEAU DE BORD
// =========================

router.get("/", exigerAuthAdmin, (req, res) => {
  const zoneFiltre = req.query.zone || "";
  const statutFiltre = req.query.statut || "";

  let sql = "SELECT * FROM candidatures WHERE 1=1";
  const params = [];

  if (zoneFiltre) {
    sql += " AND zone = ?";
    params.push(zoneFiltre);
  }

  if (statutFiltre) {
    sql += " AND statut = ?";
    params.push(statutFiltre);
  }

  sql += " ORDER BY date_soumission DESC";

  const candidatures = db.prepare(sql).all(...params);

  const total = db
    .prepare("SELECT COUNT(*) c FROM candidatures")
    .get().c;

  const enAttente = db
    .prepare(
      "SELECT COUNT(*) c FROM candidatures WHERE statut = 'en_attente'"
    )
    .get().c;

  const retenus = db
    .prepare(
      "SELECT COUNT(*) c FROM candidatures WHERE statut = 'retenu'"
    )
    .get().c;

  const nonRetenus = db
    .prepare(
      "SELECT COUNT(*) c FROM candidatures WHERE statut = 'non_retenu'"
    )
    .get().c;

  res.render("admin/dashboard", {
    candidatures,
    zones: ZONES,
    zoneFiltre,
    statutFiltre,
    stats: {
      total,
      enAttente,
      retenus,
      nonRetenus,
    },
    lienWhatsApp,
  });
});

// =========================
// FICHE CANDIDAT
// =========================

router.get("/candidat/:id", exigerAuthAdmin, (req, res) => {
  const candidat = db
    .prepare("SELECT * FROM candidatures WHERE id = ?")
    .get(req.params.id);

  if (!candidat) {
    return res.redirect("/admin");
  }

  res.render("admin/candidat", {
    candidat,
    lienWhatsAppUrl: lienWhatsApp(candidat),
    info: req.query.info || null,
  });
});

// =========================
// CHANGEMENT DE STATUT
// =========================

router.post(
  "/candidat/:id/statut",
  exigerAuthAdmin,
  (req, res) => {
    const { statut, note_admin } = req.body;

    if (!["retenu", "non_retenu", "en_attente"].includes(statut)) {
      return res.redirect("/admin");
    }

    // -----------------------------------------
    // 1. ENREGISTRER LE STATUT IMMÉDIATEMENT
    // -----------------------------------------

    db.prepare(
      `
      UPDATE candidatures
      SET
        statut = ?,
        note_admin = ?,
        date_traitement = datetime('now')
      WHERE id = ?
      `
    ).run(
      statut,
      note_admin || null,
      req.params.id
    );

    // -----------------------------------------
    // 2. RÉCUPÉRER LE CANDIDAT
    // -----------------------------------------

    const candidat = db
      .prepare("SELECT * FROM candidatures WHERE id = ?")
      .get(req.params.id);

    if (!candidat) {
      return res.redirect("/admin");
    }

    // -----------------------------------------
    // 3. RÉPONDRE IMMÉDIATEMENT AU NAVIGATEUR
    // -----------------------------------------
    //
    // On ne fait PLUS await sur l'e-mail ou WhatsApp.
    // Le navigateur n'attend donc plus ces services.

    res.redirect(
      `/admin/candidat/${req.params.id}?info=${encodeURIComponent(
        "Statut enregistré. Les notifications sont en cours de traitement."
      )}`
    );

    // -----------------------------------------
    // 4. NOTIFICATIONS EN ARRIÈRE-PLAN
    // -----------------------------------------

    if (statut === "retenu" || statut === "non_retenu") {

      // ===== EMAIL =====

      Promise.resolve()
        .then(() => envoyerStatutParEmail(candidat))
        .then((resEmail) => {
          if (resEmail && resEmail.ok) {
            db.prepare(
              "UPDATE candidatures SET email_envoye = 1 WHERE id = ?"
            ).run(candidat.id);

            console.log(
              `✅ Email envoyé au candidat #${candidat.id}`
            );
          } else {
            console.log(
              `⚠️ Email NON envoyé au candidat #${candidat.id} : ${
                resEmail?.raison || "raison inconnue"
              }`
            );
          }
        })
        .catch((e) => {
          console.error(
            `❌ Erreur email candidat #${candidat.id} :`,
            e.message
          );
        });

      // ===== WHATSAPP =====

      Promise.resolve()
        .then(() => envoyerStatutParWhatsApp(candidat))
        .then((resWa) => {
          if (resWa && resWa.ok) {
            db.prepare(
              "UPDATE candidatures SET whatsapp_envoye = 1 WHERE id = ?"
            ).run(candidat.id);

            console.log(
              `✅ WhatsApp envoyé au candidat #${candidat.id}`
            );
          } else {
            console.log(
              `ℹ️ WhatsApp automatique non envoyé au candidat #${candidat.id}`
            );
          }
        })
        .catch((e) => {
          console.error(
            `❌ Erreur WhatsApp candidat #${candidat.id} :`,
            e.message
          );
        });
    }
  }
);

// =========================
// WHATSAPP MANUEL
// =========================

router.post(
  "/candidat/:id/whatsapp-envoye",
  exigerAuthAdmin,
  (req, res) => {
    db.prepare(
      "UPDATE candidatures SET whatsapp_envoye = 1 WHERE id = ?"
    ).run(req.params.id);

    res.redirect(`/admin/candidat/${req.params.id}`);
  }
);

module.exports = router;
