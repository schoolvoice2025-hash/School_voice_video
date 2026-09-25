const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const db = require("../db/database");
const ZONES = require("../config/zones");

const router = express.Router();

// =====================================================
// CONFIGURATION VIDÉO
// =====================================================

const TAILLE_MAX_MO = Number(
  process.env.TAILLE_MAX_VIDEO_MO || 150
);

const TAILLE_MAX_OCTETS =
  TAILLE_MAX_MO * 1024 * 1024;

// =====================================================
// STOCKAGE DES VIDÉOS
// =====================================================

const storage = multer.diskStorage({
  destination: path.join(
    __dirname,
    "..",
    "public",
    "uploads"
  ),

  filename: (req, file, cb) => {
    const id = crypto
      .randomBytes(8)
      .toString("hex");

    const ext =
      path.extname(file.originalname) || ".mp4";

    cb(
      null,
      `${Date.now()}-${id}${ext}`
    );
  },
});

// =====================================================
// CONFIGURATION MULTER
// =====================================================

const upload = multer({
  storage,

  limits: {
    fileSize: TAILLE_MAX_OCTETS,
  },

  fileFilter: (req, file, cb) => {
    if (
      file.mimetype &&
      file.mimetype.startsWith("video/")
    ) {
      return cb(null, true);
    }

    cb(
      new Error(
        "Le fichier envoyé n'est pas une vidéo."
      )
    );
  },
});

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
// ENVOI D'UNE CANDIDATURE
// =====================================================

router.post("/candidature", (req, res) => {

  upload.single("video")(
    req,
    res,
    (err) => {

      // -----------------------------------------
      // ERREUR D'UPLOAD
      // -----------------------------------------

      if (err) {

        let message =
          err.message ||
          "Erreur lors de l'envoi de la vidéo.";

        // Taille maximale dépassée
        if (
          err.code === "LIMIT_FILE_SIZE"
        ) {
          message =
            `Votre vidéo dépasse la taille maximale autorisée de ${TAILLE_MAX_MO} Mo.`;
        }

        return res.status(400).render(
          "candidature",
          {
            zones: ZONES,
            erreur: message,
            tailleMaxMo: TAILLE_MAX_MO,
          }
        );
      }

      // -----------------------------------------
      // RÉCUPÉRATION DES DONNÉES
      // -----------------------------------------

      const {
        nom,
        prenom,
        email,
        whatsapp,
        zone,
        duree,
      } = req.body;

      // -----------------------------------------
      // VALIDATION DES CHAMPS
      // -----------------------------------------

      if (
        !nom ||
        !prenom ||
        !email ||
        !whatsapp ||
        !zone
      ) {
        return res.status(400).render(
          "candidature",
          {
            zones: ZONES,
            erreur:
              "Merci de remplir tous les champs.",
            tailleMaxMo: TAILLE_MAX_MO,
          }
        );
      }

      // -----------------------------------------
      // VÉRIFICATION DE LA VIDÉO
      // -----------------------------------------

      if (!req.file) {
        return res.status(400).render(
          "candidature",
          {
            zones: ZONES,
            erreur:
              "Merci de déposer votre vidéo (60 secondes maximum).",
            tailleMaxMo: TAILLE_MAX_MO,
          }
        );
      }

      // -----------------------------------------
      // VÉRIFICATION DE LA DURÉE
      // -----------------------------------------

      if (
        duree &&
        Number(duree) > 65
      ) {
        return res.status(400).render(
          "candidature",
          {
            zones: ZONES,
            erreur:
              "Votre vidéo dépasse 60 secondes. Merci de la raccourcir.",
            tailleMaxMo: TAILLE_MAX_MO,
          }
        );
      }

      // -----------------------------------------
      // ENREGISTREMENT EN BASE
      // -----------------------------------------

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
          video_filename: req.file.filename,
          video_original_name:
            req.file.originalname,
        });

        // ---------------------------------------
        // SUCCÈS
        // ---------------------------------------

        return res.redirect("/merci");

      } catch (e) {

        console.error(
          "❌ Erreur lors de l'enregistrement de la candidature :",
          e
        );

        return res.status(500).render(
          "candidature",
          {
            zones: ZONES,
            erreur:
              "Une erreur est survenue lors de l'enregistrement de votre candidature. Veuillez réessayer.",
            tailleMaxMo: TAILLE_MAX_MO,
          }
        );
      }
    }
  );
});

// =====================================================
// PAGE MERCI
// =====================================================

router.get("/merci", (req, res) => {
  res.render("merci");
});

module.exports = router;
