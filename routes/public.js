const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const db = require("../db/database");
const ZONES = require("../config/zones");

const router = express.Router();

// --- Configuration de l'upload vidéo ---
const TAILLE_MAX_MO = Number(process.env.TAILLE_MAX_VIDEO_MO || 150);


const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const id = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname) || ".mp4";
    cb(null, `${Date.now()}-${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: TAILLE_MAX_MO * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Le fichier envoyé n'est pas une vidéo."));
    }
  },
});

router.get("/", (req, res) => {
  res.render("index", { zones: ZONES });
});

router.get("/candidature", (req, res) => {
  res.render("candidature", { zones: ZONES, erreur: null, tailleMaxMo: TAILLE_MAX_MO });
});

router.post("/candidature", (req, res) => {
  upload.single("video")(req, res, (err) => {
    if (err) {
      return res.render("candidature", { zones: ZONES, erreur: err.message || "Erreur lors de l'envoi de la vidéo.", tailleMaxMo: TAILLE_MAX_MO });
    }

    const { nom, prenom, email, whatsapp, zone, duree } = req.body;

    if (!nom || !prenom || !email || !whatsapp || !zone) {
      return res.render("candidature", { zones: ZONES, erreur: "Merci de remplir tous les champs.", tailleMaxMo: TAILLE_MAX_MO });
    }
    if (!req.file) {
      return res.render("candidature", { zones: ZONES, erreur: "Merci de déposer votre vidéo (60 secondes maximum).", tailleMaxMo: TAILLE_MAX_MO });
    }
    // Sécurité supplémentaire côté serveur : refuse une durée transmise > 65s
    // (la vérification principale se fait côté navigateur avant l'envoi, voir candidature.ejs)
    if (duree && Number(duree) > 65) {
      return res.render("candidature", { zones: ZONES, erreur: "Votre vidéo dépasse 60 secondes. Merci de la raccourcir.", tailleMaxMo: TAILLE_MAX_MO });
    }

    const stmt = db.prepare(`
      INSERT INTO candidatures (nom, prenom, email, whatsapp, zone, video_filename, video_original_name)
      VALUES (@nom, @prenom, @email, @whatsapp, @zone, @video_filename, @video_original_name)
    `);
    stmt.run({
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      zone,
      video_filename: req.file.filename,
      video_original_name: req.file.originalname,
    });

    res.redirect("/merci");
  });
});

router.get("/merci", (req, res) => {
  res.render("merci");
});

module.exports = router;
