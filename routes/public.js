const express = require("express");

const db = require("../db/database");
const ZONES = require("../config/zones");

const router = express.Router();

// =====================================================
// CONFIGURATION VIDÉO
// =====================================================

const TAILLE_MAX_MO = Number(
  process.env.TAILLE_MAX_VIDEO_MO || 150
);

const CLOUDINARY_CLOUD_NAME = "krylli5g";

// =====================================================
// PAGE D'ACCUEIL
// =====================================================

router.get("/", (req, res) => {
  res.render("index", {
    zones: ZONES,
  });
});

// =====================================================
// PAGE CANDIDATURE
// =====================================================

router.get("/candidature", (req, res) => {
  res.render("candidature", {
    zones: ZONES,
    erreur: null,
    tailleMaxMo: TAILLE_MAX_MO,
  });
});

// =====================================================
// ENREGISTREMENT D'UNE CANDIDATURE
// La vidéo est déjà envoyée directement à Cloudinary
// =====================================================

router.post("/candidature", (req, res) => {

  const {
    nom,
    prenom,
    email,
    whatsapp,
    zone,
    duree,
    video_url,
    video_public_id,
    video_original_name,
  } = req.body;

  // ===================================================
  // VALIDATION DES INFORMATIONS
  // ===================================================

  if (
    !nom ||
    !prenom ||
    !email ||
    !whatsapp ||
    !zone
  ) {
    return res.status(400).render("candidature", {
      zones: ZONES,
      erreur: "Merci de remplir tous les champs.",
      tailleMaxMo: TAILLE_MAX_MO,
    });
  }

  // ===================================================
  // VÉRIFICATION DE LA VIDÉO
  // ===================================================

  if (!video_url) {
    return res.status(400).render("candidature", {
      zones: ZONES,
      erreur:
        "Merci de sélectionner et d'envoyer votre vidéo.",
      tailleMaxMo: TAILLE_MAX_MO,
    });
  }

  // ===================================================
  // SÉCURITÉ : vérifier que l'URL vient bien
  // de notre compte Cloudinary
  // ===================================================

  const cloudinaryPrefix =
    `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/`;

  if (!video_url.startsWith(cloudinaryPrefix)) {
    console.error(
      "❌ URL vidéo Cloudinary invalide :",
      video_url
    );

    return res.status(400).render("candidature", {
      zones: ZONES,
      erreur:
        "La vidéo n'a pas été correctement enregistrée. Merci de réessayer.",
      tailleMaxMo: TAILLE_MAX_MO,
    });
  }

  // ===================================================
  // VÉRIFICATION DE LA DURÉE
  // ===================================================

  if (duree && Number(duree) > 60.5) {
    return res.status(400).render("candidature", {
      zones: ZONES,
      erreur:
        "Votre vidéo dépasse 60 secondes. Merci de la raccourcir.",
      tailleMaxMo: TAILLE_MAX_MO,
    });
  }

  // ===================================================
  // ENREGISTREMENT EN BASE DE DONNÉES
  // ===================================================

  try {

    const stmt = db.prepare(`
      INSERT INTO candidatures (
        nom,
        prenom,
        email,
        whatsapp,
        zone,
        video_filename,
        video_original_name
      )
      VALUES (
        @nom,
        @prenom,
        @email,
        @whatsapp,
        @zone,
        @video_filename,
        @video_original_name
      )
    `);

    stmt.run({
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      zone: zone,

      // On conserve l'URL Cloudinary dans
      // l'ancien champ video_filename
      video_filename: video_url,

      video_original_name:
        (video_original_name || video_public_id || "video")
          .trim(),
    });

    console.log(
      `✅ Candidature enregistrée : ${prenom} ${nom}`
    );

    console.log(
      `☁️ Vidéo Cloudinary : ${video_url}`
    );

    // =================================================
    // SUCCÈS
    // =================================================

    return res.redirect("/merci");

  } catch (e) {

    console.error(
      "❌ Erreur lors de l'enregistrement de la candidature :",
      e
    );

    return res.status(500).render("candidature", {
      zones: ZONES,
      erreur:
        "Une erreur est survenue lors de l'enregistrement de votre candidature. Veuillez réessayer.",
      tailleMaxMo: TAILLE_MAX_MO,
    });
  }
});

// =====================================================
// PAGE MERCI
// =====================================================

router.get("/merci", (req, res) => {
  res.render("merci");
});

module.exports = router;
