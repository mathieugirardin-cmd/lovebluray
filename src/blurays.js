import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTION_ID } from './utils';

function blurayCollectionRef() {
  return db ? collection(db, 'collections', COLLECTION_ID, 'blurays') : null;
}

export function watchBlurays(callback, errorCallback) {
  if (!db) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    blurayCollectionRef(),
    (snapshot) => {
      const blurays = snapshot.docs.map((blurayDoc) => ({
        id: blurayDoc.id,
        ...blurayDoc.data(),
      }));
      callback(blurays);
    },
    errorCallback
  );
}

export async function saveBlurayDocument({ blurayId, data }) {
  if (!db) {
    throw new Error('Firebase Firestore n est pas configure.');
  }

  const ref = doc(db, 'collections', COLLECTION_ID, 'blurays', blurayId);
  await setDoc(ref, data, { merge: true });
  return ref.id;
}

export async function removeBlurayDocument(blurayId) {
  if (!db) {
    throw new Error('Firebase Firestore n est pas configure.');
  }

  await deleteDoc(doc(db, 'collections', COLLECTION_ID, 'blurays', blurayId));
}

export function blurayDocumentRef(blurayId) {
  return db ? doc(db, 'collections', COLLECTION_ID, 'blurays', blurayId) : null;
}
