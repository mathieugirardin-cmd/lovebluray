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
```

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
- Un ajout sans jaquette crée `blurays/{blurayId}`.
- Un ajout avec jaquette crée aussi `covers/{blurayId}`.

## Build et GitHub Pages

```bash
npm run build
```

Le build Vite utilise `base: './'` pour rester compatible avec GitHub Pages. Après déploiement, ajoute le domaine GitHub Pages dans Authentication > Settings > Authorized domains.
