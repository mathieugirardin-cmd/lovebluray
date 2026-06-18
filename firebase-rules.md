# Firestore rules

Firebase Storage n'est pas utilise dans ce projet. Copie uniquement ces regles dans
`Firestore Database > Rules`.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isMember(collectionId) {
      return isSignedIn()
        && exists(/databases/$(database)/documents/collections/$(collectionId)/members/$(request.auth.uid));
    }

    function isOwner(collectionId) {
      return isMember(collectionId)
        && get(/databases/$(database)/documents/collections/$(collectionId)/members/$(request.auth.uid)).data.role == "owner";
    }

    match /collections/{collectionId} {
      allow read: if isMember(collectionId);
      allow create: if isSignedIn() && collectionId == "maison-mathieu-quentin";
      allow update, delete: if isOwner(collectionId);

      match /members/{userId} {
        allow read: if isMember(collectionId) || (isSignedIn() && request.auth.uid == userId);
        allow create, update, delete: if isOwner(collectionId);
      }

      match /blurays/{blurayId} {
        allow read: if isMember(collectionId);
        allow create, update, delete: if isMember(collectionId);
      }

      match /covers/{blurayId} {
        allow read: if isMember(collectionId);

        allow create, update: if isMember(collectionId)
          && request.resource.data.imageData is string
          && request.resource.data.imageData.size() < 900000;

        allow delete: if isMember(collectionId);
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Important: avec ces regles, chaque utilisateur doit avoir un document membre dans
`collections/maison-mathieu-quentin/members/{uid}`. Le premier document membre
avec `role: "owner"` doit etre cree depuis la console Firebase.
