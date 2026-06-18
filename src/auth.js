import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, firebaseStatus } from './firebase';

function isRedirectBetter() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export async function initAuth(onUser, onError) {
  if (!auth) {
    onUser(null, { ready: true, configured: false });
    return () => {};
  }

  try {
    await getRedirectResult(auth);
  } catch (error) {
    onError(error);
  }

  return onAuthStateChanged(
    auth,
    (user) => {
      onUser(user, { ready: true, configured: firebaseStatus.ready });
    },
    (error) => onError(error)
  );
}

export async function loginWithEmail({ email, password }) {
  if (!auth) {
    throw new Error('Firebase Authentication n est pas configure.');
  }

  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail({ email, password, displayName }) {
  if (!auth) {
    throw new Error('Firebase Authentication n est pas configure.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
  return credential;
}

export async function loginWithGoogle() {
  if (!auth || !googleProvider) {
    throw new Error('Firebase Authentication n est pas configure.');
  }

  if (isRedirectBetter()) {
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  return signInWithPopup(auth, googleProvider);
}

export async function logoutUser() {
  if (!auth) {
    return;
  }

  await signOut(auth);
}
