# Guide de Déploiement Vercel 🚀

Ce document explique comment déployer l'application **DEM — Ticket de Voyage Sénégal** sur **Vercel** tout en garantissant que les fonctionnalités d'envoi d'e-mails (EmailJS) et de base de données (Supabase) fonctionnent correctement.

---

## 🛠️ Pourquoi les variables et l'API ne fonctionnent pas par défaut sur Vercel ?

Par défaut, Vercel déploie les sites construits avec **Vite** comme des applications purement statiques (SPA - Single Page Application). 
Notre application dispose d'un proxy serveur sécurisé (`server.ts`) pour éviter de divulguer vos clés EmailJS secrètes et vos configurations dans le navigateur des clients.

Pour que ces endpoints d'API (comme `/api/send-email` ou `/api/bookings`) fonctionnent sur Vercel, nous avons créé :
1. **`/api/index.ts`** : Une fonction Serverless Vercel Node.js qui héberge l'ensemble des routes d'API Express.
2. **`vercel.json`** : Un fichier de configuration qui indique à Vercel de rediriger toutes les requêtes `/api/*` vers cette fonction Serverless, tout en servant le reste statiquement.

---

## 🔑 Variables d'Environnement à Configurer sur Vercel

Pour que l'envoi d'emails et la synchronisation fonctionnent, vous devez configurer les variables suivantes dans le panneau **Settings > Environment Variables** de votre projet sur Vercel :

### 1. Configuration EmailJS (Pour les notifications de tickets)
Ces clés permettent l'envoi des confirmations de billets par e-mail.

| Nom de la variable sur Vercel | Valeur de Exemple / Description |
| :--- | :--- |
| **`VITE_EMAILJS_PUBLIC_KEY`** | Code Public d'EmailJS (ex: `user_xxxxxxxxxxxxxxxx`) |
| **`VITE_EMAILJS_SERVICE_ID`** | Identifiant de votre Service d'envoi EmailJS (ex: `service_xxxxxx`) |
| **`VITE_EMAILJS_TEMPLATE_ID`** | Identifiant de votre Template d'e-mail EmailJS (ex: `template_xxxxxx`) |
| **`VITE_EMAILJS_TO_EMAIL`** | L'adresse e-mail de réception de l'administrateur (ex: `votre-email@gmail.com`) ou l'e-mail client |

### 2. Configuration Supabase (Pour la sauvegarde des réservations)
Ces variables permettent d'activer la synchronisation en temps réel et hors-ligne de vos réservations.

| Nom de la variable sur Vercel | Valeur de Exemple / Description |
| :--- | :--- |
| **`VITE_SUPABASE_URL`** | URL de votre projet Supabase (`https://xxxxxxxxxxxxxxxxxxxx.supabase.co`) |
| **`VITE_SUPABASE_ANON_KEY`**| Clé d'API publique anonyme Supabase |

---

## 🚀 Étape par Étape : Déployer sur Vercel

1. **Associer votre dépôt GitHub** avec Vercel.
2. **Créer un nouveau projet** sur Vercel en sélectionnant votre dépôt.
3. Vercel détectera automatiquement que le framework sous-jacent est **Vite** :
   - *Framework Preset* : **Vite** (considéré par défaut)
   - *Build Command* : `npm run build`
   - *Output Directory* : `dist`
4. **Ajouter les variables d'environnement** listées ci-dessus dans la section dédiée sur Vercel.
5. Cliquer sur **Deploy**.

Une fois le déploiement terminé, les e-mails de vos tickets et l'accès à Supabase fonctionneront de manière transparente via le proxy serveur sécurisé sous Vercel !
