# Lovebluray

PWA mobile-first pour gérer la collection Blu-ray partagée de Mathieu et Quentin.

## Architecture gratuite

Lovebluray utilise uniquement:

- Firebase Authentication
- Cloud Firestore
- GitHub Pages

Firebase Storage n'est pas utilisé. Aucune carte bancaire n'est nécessaire. Les jaquettes sont compressées dans le navigateur puis stockées dans Firestore dans une sous-collection séparée.

## Navigation

- `Accueil`: dashboard de statistiques.
- `Collection`: films possédés, avec recherche, filtre genre, filtre année, vue liste ou grille.
- `À acheter`: films avec `status: "À acheter"`.
- `En cours d'achat`: films avec `status: "En cours d'achat"`.
- `Non visualisé`: films avec `status: "Possédé"` et `watched: false`.

Le compte Firebase Authentication est affiché dans le header avec `displayName`, ou `email` si aucun nom n'est disponible.

## Statistiques Accueil

Le dashboard affiche:

- Total collection
- Films vus
- Films non vus
- À acheter
- En cours d'achat
- Films 3D
- % vus
- % d'achat

Les pourcentages sont calculés côté client depuis les documents Firestore.

## Structure Firestore

```text
collections/maison-mathieu-quentin/blurays/{blurayId}
collections/maison-mathieu-quentin/covers/{blurayId}
collections/maison-mathieu-quentin/members/{userId}
```

Document `blurays/{blurayId}`:

```js
{
  title,
  saga,
  genre,
  year,
  director,
  status,
  owner,
  location,
  barcode,
  rating,
  comment,
  coverExternalUrl,
  autoFilledFromBarcode,
  metadataSource,
  is3D,
  hasCover,
  watched,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy
}
```

Document `covers/{blurayId}`:

```js
{
  blurayId,
  imageData,
  mimeType,
  size,
  updatedAt,
  updatedBy
}
```

`format` a été supprimé. Le champ `is3D` le remplace pour indiquer si le film est en 3D.

## Genres

Le champ `genre` est une liste prédéfinie utilisée dans le formulaire, les filtres et les fiches:

```js
[
  "Action",
  "Aventure",
  "Animation",
  "Biopic",
  "Comédie",
  "Comédie dramatique",
  "Comédie romantique",
  "Crime",
  "Documentaire",
  "Drame",
  "Espionnage",
  "Fantastique",
  "Fantasy",
  "Guerre",
  "Historique",
  "Horreur",
  "Musical",
  "Policier",
  "Romance",
  "Science-fiction",
  "Super-héros",
  "Thriller",
  "Western",
  "Autre"
]
```

## Statuts

Statuts possibles:

- `Possédé`
- `À acheter`
- `En cours d'achat`

La visualisation utilise `watched: true` ou `watched: false`. Il n'y a pas de statut séparé pour les films non visualisés.

## Installation locale

```bash
npm install
copy .env.example .env
npm run dev
```

## Variables d'environnement

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_TMDB_API_KEY=
```

`VITE_TMDB_API_KEY` est optionnelle. Sans clé TMDB, le scan conserve le code-barres et tente seulement les informations disponibles via UPCitemdb.

## Scan code-barres V2

Le formulaire d'ajout et de modification propose un bouton `Scanner le code-barres`.

Fonctionnement:

- ouverture de la caméra du téléphone;
- scan EAN/UPC avec `@zxing/browser` chargé côté navigateur;
- fallback possible avec `BarcodeDetector` si ZXing est indisponible;
- remplissage automatique du champ `barcode`;
- recherche gratuite via UPCitemdb;
- recherche TMDB optionnelle si `VITE_TMDB_API_KEY` est renseignée;
- proposition des informations trouvées sans sauvegarde automatique;
- bouton `Utiliser ces infos` pour préremplir le formulaire;
- correction manuelle possible avant enregistrement.

TMDB ne recherche pas par code-barres. L'application récupère ou déduit d'abord un titre depuis le code-barres, puis cherche ce titre dans TMDB.

Les jaquettes automatiques ne sont pas stockées en base64. Si une image externe est trouvée, son URL est stockée dans `coverExternalUrl`. Les jaquettes importées manuellement continuent d'être compressées et stockées dans Firestore dans `covers/{blurayId}`.

Champs automatiques possibles:

```js
{
  coverExternalUrl,
  autoFilledFromBarcode,
  metadataSource
}
```

Pour créer une clé TMDB:

1. Crée un compte sur `https://www.themoviedb.org/`.
2. Va dans `Settings > API`.
3. Demande une clé API.
4. Ajoute la clé dans `.env`:

```env
VITE_TMDB_API_KEY=ta-cle-tmdb
```

Cette fonctionnalité reste optionnelle et l'application fonctionne sans TMDB.

## Configuration Firebase

Dans Firebase Console:

1. Active Authentication.
2. Active Email/Password.
3. Active Google si tu veux utiliser le bouton Google.
4. Crée Cloud Firestore en mode production.
5. Copie les règles de `firebase-rules.md` dans Firestore Database > Rules.
6. N'active pas Firebase Storage.

## Premier membre

Les règles Firestore sont strictes: seuls les membres peuvent lire et écrire.

Après création du premier compte dans l'application, récupère son `uid` dans Firebase Authentication, puis crée ce document dans Firestore:

```text
collections/maison-mathieu-quentin/members/{uid}
```

Exemple:

```js
{
  uid: "UID_DU_COMPTE",
  email: "ton-email@example.com",
  displayName: "Mathieu",
  role: "owner"
}
```

Tu peux ensuite ajouter Quentin avec `role: "member"` ou `role: "owner"`.

## Tests attendus

- L'app s'ouvre sur `Accueil`.
- Le compte utilisateur est visible dans le header.
- Le dashboard affiche les statistiques.
- `Collection` affiche les films possédés.
- La recherche filtre par titre.
- Les filtres genre et année fonctionnent.
- La vue liste/grille peut être changée.
- `À acheter`, `En cours d'achat` et `Non visualisé` affichent les bons films.
- Le bouton `Scanner le code-barres` ouvre la caméra sur mobile.
- Un code-barres EAN/UPC remplit automatiquement le champ `barcode`.
- Si une fiche est trouvée, elle est proposée sans sauvegarde automatique.
- Le bouton `Utiliser ces infos` préremplit le formulaire.
- Si aucune fiche n'est trouvée, le code-barres reste rempli et la saisie manuelle reste possible.
- Un ajout sans jaquette crée `blurays/{blurayId}`.
- Un ajout avec jaquette crée aussi `covers/{blurayId}`.

## Build et GitHub Pages

```bash
npm run build
```

Le build Vite utilise `base: './'` pour rester compatible avec GitHub Pages. Après déploiement, ajoute le domaine GitHub Pages dans Authentication > Settings > Authorized domains.

## Accès depuis l'extérieur

Pour utiliser Lovebluray hors de la maison, déploie l'application sur GitHub Pages.

Étapes:

1. Crée un repository GitHub pour le projet.
2. Pousse ce dossier sur GitHub.
3. Dans GitHub, va dans `Settings > Secrets and variables > Actions`.
4. Ajoute ces secrets avec les valeurs Firebase:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
   - `VITE_TMDB_API_KEY` (optionnel)
5. Va dans `Settings > Pages`.
6. Choisis `GitHub Actions` comme source de déploiement.
7. Pousse sur `main` ou `master`: le workflow `.github/workflows/deploy-pages.yml` publie automatiquement `dist`.
8. Ajoute le domaine GitHub Pages dans Firebase Authentication > Settings > Authorized domains.

L'adresse publique ressemblera à:

```text
https://ton-compte.github.io/nom-du-repo/
```

Cette URL HTTPS sera accessible depuis ton mobile, même hors de la maison.
