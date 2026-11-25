# Les MotsPassants — Le match littéraire

Application web progressive (PWA), pensée pour le mobile, de la librairie indépendante **Les MotsPassants** (Nantes).

Le principe : un « match littéraire » inspiré des applications de rencontres. Le lecteur répond à un court questionnaire (environ deux minutes), swipe parmi des livres qui lui correspondent, puis peut demander la réservation d'un exemplaire physique **par e-mail**, à retirer en librairie.

> Ce n'est **pas** une boutique en ligne : pas de paiement, pas de livraison. Le règlement se fait en librairie, au retrait.

---

## Principes du projet

- **Aucun compte, aucune inscription, aucun login.** Pas de zone d'administration dans l'application.
- **Aucune donnée de lecteur côté serveur** : ni profil, ni préférences, ni historique, ni e-mail, ni table de réservations.
- **Stockage local facultatif** : uniquement avec l'accord explicite du lecteur, uniquement sur son appareil (IndexedDB). Les réponses au questionnaire ne sont jamais enregistrées.
- **Rien d'inventé** : ni livres, ni couvertures, ni prix, ni coordonnées. Ce qui manque reste vide.
- **Disponibilité** : l'application ne connaît pas les stocks. Elle affiche partout « Contactez-nous pour connaître la disponibilité », jamais de quantité.
- **Réservation = demande par e-mail** (lien `mailto:`). L'application ne peut pas savoir si le message est envoyé : elle ne parle jamais de « réservation confirmée ».
- Interface **100 % en français**.

## Fonctionnalités

| Onglet | Contenu |
| --- | --- |
| **Découvrir** | Questionnaire, puis swipe (droite : j'aime, gauche : je passe), avec alternative en boutons (retour, cœur, surprise, fiche). Écran « C'est un Match ! » pour les forts scores. |
| **Mes Matchs** | Les livres matchés, conservés sur l'appareil si le lecteur l'a accepté. |
| **Favoris** | Coups de cœur, en cartes ou en liste. |
| **Notre librairie** | Présentation, adresse, horaires, téléphone, accès, bouton « Écrire à la librairie ». |

Une page de politique de confidentialité complète l'ensemble.

## Pile technique

- **Front** : Vite, React, TypeScript, Tailwind CSS
- **PWA** : vite-plugin-pwa (manifeste, service worker, icônes)
- **Backend** : Supabase (base Postgres en lecture publique, Edge Function d'enrichissement)
- **Stockage local** : IndexedDB, via un unique module `storage`
- **Polices** : Lora (titres), Work Sans (textes)
- **Hébergement** : à définir (Vercel, Netlify, GitHub Pages…)

## Prérequis

- Node.js (version LTS récente) et npm
- Un projet Supabase (à créer sur [supabase.com](https://supabase.com))
- [Supabase CLI](https://supabase.com/docs/guides/cli) pour les migrations et l'Edge Function
- Le fichier CSV du catalogue (50 livres) et le logo `log.svg`, à placer dans le dossier du projet

## Installation

```bash
git clone <url-du-depot>
cd <nom-du-dossier>
npm install
cp .env.example .env
```

Renseignez ensuite le fichier `.env` (voir ci-dessous), puis :

```bash
npm run dev
```

### Variables d'environnement

Seules ces deux valeurs, publiques, peuvent figurer dans le code client :

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

⚠️ Le fichier `.env` est listé dans `.gitignore`. La clé **`service_role`** et le secret administrateur ne doivent **jamais** apparaître dans le code client ni être commités.

## Mise en place de la base Supabase

1. Créez le projet sur supabase.com et récupérez l'URL et la clé publique (anon).
2. Appliquez les migrations versionnées dans `supabase/migrations` :

   ```bash
   supabase link --project-ref <ref-du-projet>
   supabase db push
   ```

3. Importez le catalogue (opération ponctuelle, depuis votre machine) :

   ```bash
   SUPABASE_SERVICE_ROLE_KEY=<votre-cle> npm run import:books
   ```

   Le script traite l'ISBN comme du texte (tirets et espaces supprimés), découpe les colonnes multi-valeurs avec le séparateur « / », détecte les doublons et produit un rapport des lignes incorrectes, sans rien importer silencieusement.

4. Sécurité (RLS) : la table `books` est en **lecture publique (SELECT) uniquement**. Aucune écriture n'est possible depuis le navigateur.

Les mises à jour ultérieures (prix, etc.) se font depuis le tableau de bord Supabase.

## Enrichissement des livres (couvertures, résumés)

L'Edge Function `enrich-books` complète les livres où `is_enriched = false`. Elle n'est pas liée à l'application et se déclenche manuellement.

Sources, par ordre de priorité : **Open Library**, puis **Google Books** en secours. Elle ne remplit que les champs vides et n'écrase jamais une donnée du CSV. Elle traite environ 20 livres par appel, avec 400 ms entre chaque livre, et renvoie un rapport (livres enrichis, livres incomplets, erreurs).

```bash
supabase secrets set ADMIN_SECRET=<votre-secret>
supabase functions deploy enrich-books

curl -X POST "https://<ref-du-projet>.supabase.co/functions/v1/enrich-books" \
  -H "x-admin-secret: <votre-secret>"
```

À relancer jusqu'à ce que tous les livres soient traités. Un livre sans couverture reçoit un visuel de secours avec son titre et son auteur ; aucune image n'est générée par IA.

## Configuration

Un fichier de configuration unique regroupe les valeurs à modifier :

- l'adresse e-mail de la librairie (valeur provisoire : `blabla@lesmotspassants.fr`, **à remplacer avant la mise en ligne**) ;
- le texte de disponibilité ;
- le seuil de Match (80 % par défaut) ;
- les pondérations du matching : genre 20 %, humeur 15 %, thèmes 15 %, livres similaires 15 %, style 10 %, personnages 10 %, type d'histoire 10 %, profil de lecteur 5 %. Le format, la longueur et le prix servent de filtres complémentaires.

## Scripts

Les noms exacts dépendent de votre `package.json` ; voici les commandes usuelles :

```bash
npm run dev       # serveur de développement
npm run build     # build de production
npm run preview   # prévisualiser le build (utile pour tester la PWA)
npm test          # tests automatisés du calcul de matching
```

## Structure du projet (indicative)

```
├── public/                 # icônes PWA, log.svg
├── src/
│   ├── components/         # composants réutilisables
│   ├── config/             # constantes uniques (e-mail, pondérations, seuil…)
│   ├── lib/
│   │   ├── matching/       # algorithme de matching et tests
│   │   └── storage/        # unique point d'accès à IndexedDB
│   └── pages/              # Découvrir, Mes Matchs, Favoris, Notre librairie, Confidentialité
├── supabase/
│   ├── migrations/         # schéma SQL versionné
│   └── functions/
│       └── enrich-books/   # Edge Function d'enrichissement
├── scripts/                # import du CSV
├── .env.example
└── README.md
```

## Accessibilité

Texte d'au moins 16 px (18 px pour les paragraphes), contraste WCAG AA minimum, boutons d'au moins 44 × 44 px, information jamais transmise par la couleur seule, alternative en boutons à chaque geste, respect de `prefers-reduced-motion`, texte alternatif sur les images.

## Confidentialité

- Aucune donnée de lecteur n'est conservée côté serveur.
- Le message de réservation part de la messagerie du lecteur.
- Le stockage local n'existe qu'avec l'accord du lecteur et reste sur son appareil. Il peut être désactivé et effacé à tout moment (« Effacer mes données »).
- Pas de newsletter, pas d'e-mails commerciaux.

## Avant la mise en ligne

- [ ] Remplacer l'adresse e-mail provisoire par la vraie
- [ ] Renseigner les vraies coordonnées de la librairie (adresse, horaires, téléphone, accès)
- [ ] Lancer l'enrichissement et vérifier les livres restés incomplets
- [ ] Choisir et configurer l'hébergement
- [ ] Vérifier qu'aucune écriture n'a lieu avant l'accord du lecteur (IndexedDB, localStorage)
- [ ] Vérifier qu'aucune requête d'écriture ne part vers Supabase depuis le navigateur
- [ ] Lancer un audit Lighthouse (PWA, accessibilité)

## Licence

À définir.
