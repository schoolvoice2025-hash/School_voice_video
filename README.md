# School Voice 2027 — Plateforme de casting vidéo

Cette plateforme est **distincte** du site d'inscription des candidats. Elle sert uniquement à :

1. laisser chaque candidat déjà inscrit déposer une **vidéo de 60 secondes maximum** (nom, prénom, zone, email, WhatsApp + fichier vidéo) ;
2. permettre à l'équipe d'organisation d'**écouter, noter et décider** (retenu / non retenu) depuis un espace admin protégé par mot de passe ;
3. **envoyer automatiquement** au candidat un email (et, si configuré, un WhatsApp) lui annonçant le résultat.

---

## 1. Installation

Prérequis : [Node.js](https://nodejs.org) version 18 ou plus récente.

```bash
cd school-voice-casting
npm install
cp .env.example .env
```

Ouvrez le fichier `.env` créé et remplissez au minimum :
- `ADMIN_PASSWORD` : le mot de passe de l'espace organisation
- `SESSION_SECRET` : une longue chaîne aléatoire quelconque
- `GMAIL_USER` et `GMAIL_APP_PASSWORD` : voir section 3 ci-dessous

Puis démarrez le serveur :

```bash
npm start
```

- Site public : http://localhost:3000
- Espace organisation : http://localhost:3000/admin/login

La base de données (`data.sqlite`) et le dossier des vidéos (`public/uploads/`) sont créés automatiquement au premier lancement.

---

## 2. Comment ça fonctionne

### Côté candidat
1. Le candidat va sur `/candidature`.
2. Il renseigne prénom, nom, sa zone, son email, son numéro WhatsApp, puis choisit son fichier vidéo.
3. **La durée est vérifiée directement dans son navigateur** avant l'envoi : si la vidéo dépasse 60 secondes, le bouton d'envoi reste bloqué et un message l'invite à la raccourcir. (Une seconde vérification a lieu côté serveur par sécurité.)
4. Une fois envoyée, la vidéo est stockée sur le serveur et la candidature apparaît dans l'espace admin avec le statut "En attente".

### Côté organisation (`/admin`)
1. Connexion avec le mot de passe défini dans `.env`.
2. Le tableau de bord liste toutes les candidatures, avec compteurs (total, en attente, retenues, non retenues) et filtres par zone / statut.
3. En ouvrant une candidature, vous pouvez **visionner la vidéo directement dans la page**, ajouter une note interne, puis cliquer :
   - **✅ Vidéo retenue** → enregistre le statut et envoie automatiquement l'email "candidature retenue" (invitation au casting de décembre).
   - **❌ Non retenue** → enregistre le statut et envoie automatiquement l'email "candidature non retenue".
4. Un bouton **"Envoyer sur WhatsApp"** ouvre WhatsApp avec le message déjà rédigé, prêt à envoyer en un clic — voir section 4 pour l'envoi 100% automatique.

---

## 3. Configurer l'envoi d'email (Gmail)

1. Sur le compte Gmail qui enverra les messages (ex. `schoolvoice2025@gmail.com`), activez la **validation en 2 étapes** : https://myaccount.google.com/security
2. Générez ensuite un **mot de passe d'application** : https://myaccount.google.com/apppasswords
   - Application : "Autre", nommez-le par exemple "School Voice Casting"
   - Copiez le mot de passe généré (16 caractères)
3. Dans `.env` :
   ```
   GMAIL_USER=schoolvoice2025@gmail.com
   GMAIL_APP_PASSWORD=le-mot-de-passe-genere-ici
   ```
4. Redémarrez le serveur. Tant que ces deux valeurs ne sont pas renseignées, l'email ne part pas (l'admin vous le signale sur la fiche candidat), mais rien d'autre n'est bloqué.

Les deux modèles de message (retenu / non retenu) sont modifiables dans `services/email.js`.

---

## 4. Configurer l'envoi automatique WhatsApp (optionnel)

**Important à savoir avant de commencer :** WhatsApp n'a pas d'équivalent du "mot de passe d'application" de Gmail. L'envoi automatique de messages passe obligatoirement par l'**API Cloud WhatsApp de Meta**, qui demande la création d'un compte Meta for Developers et, pour envoyer un message texte libre comme ceux de cette plateforme, que **le candidat vous ait écrit sur WhatsApp dans les 24h précédentes** (sinon Meta impose l'utilisation d'un "template" de message pré-approuvé, plus contraignant).

**C'est pourquoi la plateforme fonctionne très bien sans cette configuration :** le bouton "Envoyer sur WhatsApp" sur chaque fiche candidat ouvre WhatsApp Web ou l'application avec le message déjà rédigé — il ne reste qu'à cliquer sur "Envoyer". C'est un clic de plus par candidat, mais zéro configuration requise et ça fonctionne dès aujourd'hui.

Si vous voulez malgré tout automatiser complètement l'envoi WhatsApp :
1. Créez un compte sur https://developers.facebook.com et une application de type "Business".
2. Ajoutez le produit **WhatsApp** à l'application, associez un numéro de téléphone (ou utilisez le numéro de test fourni par Meta pour commencer).
3. Récupérez le **jeton d'accès temporaire** (ou générez-en un permanent via un compte système) et l'**ID du numéro de téléphone**.
4. Renseignez-les dans `.env` :
   ```
   WHATSAPP_TOKEN=votre-jeton
   WHATSAPP_PHONE_NUMBER_ID=votre-id-numero
   ```
5. Redémarrez le serveur : la plateforme tentera alors l'envoi automatique à chaque décision, et se rabattra silencieusement sur le lien manuel en cas d'échec (candidat n'ayant pas écrit dans les 24h, jeton expiré, etc.).

---

## 5. Zones du concours

Les 8 zones proposées dans le formulaire (`config/zones.js`) sont : Abomey-Calavi, Cotonou, Porto-Novo, Ouidah, Comè, Lokossa, Bohicon, Abomey — les mêmes que celles du dossier de sponsoring et du guide de prospection. Pour en ajouter ou en modifier, éditez simplement ce fichier.

---

## 6. Déploiement en ligne

Pour que les candidats et l'équipe y accèdent depuis n'importe où (pas seulement en local), il faut héberger ce projet Node.js quelque part. Options simples, avec un plan gratuit :

- **[Render.com](https://render.com)** : créez un "Web Service" à partir de ce dossier (ou d'un dépôt GitHub), commande de build `npm install`, commande de démarrage `npm start`, puis ajoutez vos variables d'environnement dans l'onglet "Environment".
- **[Railway.app](https://railway.app)** : même principe, déploiement en quelques clics depuis GitHub.

**Point d'attention important :** sur la plupart des hébergements gratuits, le disque est *éphémère* — à chaque redéploiement, les vidéos stockées dans `public/uploads/` et la base `data.sqlite` peuvent être supprimées. Pour un usage réel avec de nombreuses vidéos, il est recommandé soit de choisir un plan avec disque persistant, soit de faire évoluer le stockage vidéo vers un service comme Cloudinary ou AWS S3 (des services gratuits jusqu'à un certain volume). Ce n'est pas nécessaire pour tester la plateforme, mais à prévoir avant l'ouverture officielle des dépôts aux candidats.

---

## 7. Structure du projet

```
school-voice-casting/
├── server.js              → point d'entrée
├── config/zones.js         → liste des 8 zones
├── db/database.js          → connexion SQLite + création des tables
├── middleware/auth.js      → protection de l'espace admin
├── services/email.js       → envoi des emails (Gmail) + textes des messages
├── services/whatsapp.js    → envoi WhatsApp (API Meta + lien manuel)
├── routes/public.js        → pages candidat (accueil, formulaire, envoi)
├── routes/admin.js         → connexion, tableau de bord, décisions
├── views/                  → pages EJS (candidat + admin)
└── public/
    ├── css/style.css
    └── uploads/             → vidéos déposées (créé automatiquement)
```

---

## 8. Sécurité et bon sens

- Changez `ADMIN_PASSWORD` et `SESSION_SECRET` avant toute mise en ligne réelle.
- Ne partagez jamais le fichier `.env` (il contient vos identifiants).
- Pensez à limiter la taille des vidéos (`TAILLE_MAX_VIDEO_MO` dans `.env`, 150 Mo par défaut) selon la qualité que vous attendez.
