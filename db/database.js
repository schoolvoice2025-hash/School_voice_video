const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "data.sqlite");
const isNew = !fs.existsSync(dbPath);
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS candidatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    zone TEXT NOT NULL,
    video_filename TEXT NOT NULL,
    video_original_name TEXT,
    date_soumission TEXT NOT NULL DEFAULT (datetime('now')),
    statut TEXT NOT NULL DEFAULT 'en_attente',
    note_admin TEXT,
    date_traitement TEXT,
    email_envoye INTEGER NOT NULL DEFAULT 0,
    whatsapp_envoye INTEGER NOT NULL DEFAULT 0
  );
`);

if (isNew) {
  console.log("Nouvelle base de données créée : data.sqlite");
}

module.exports = db;
