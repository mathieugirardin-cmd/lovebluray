import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseStatus } from './firebase';
import { initAuth, loginWithEmail, loginWithGoogle, logoutUser, registerWithEmail } from './auth';
import { removeBlurayDocument, saveBlurayDocument, watchBlurays } from './blurays';
import { deleteCoverDocument, getCoverDocument, saveCoverDocument } from './covers';
import { lookupBarcodeMetadata, searchTitleMetadata } from './metadata';
import { startBarcodeScanner } from './scanner';
import { computeStats } from './stats';
import {
  APP_NAME,
  blurayToSearchBlob,
  clamp,
  canonicalStatus,
  COLLECTION_ID,
  COLLECTION_NAME,
  emptyBlurayForm,
  isBuying,
  isOwned,
  isToBuy,
  nextYear,
  normalizeText,
} from './utils';
import { renderAppOverlays, renderAppState, renderAuthScreen, renderToastStack } from './ui';
import './styles.css';

const appRoot = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');

const state = {
  ready: false,
  configReady: firebaseStatus.ready,
  configMissingKeys: firebaseStatus.missingKeys,
  user: null,
  member: null,
  blurays: [],
  covers: {},
  loadingBlurays: true,
  busy: false,
  offline: !navigator.onLine,
  route: parseRoute(),
  filters: {
    search: '',
    genre: 'all',
    year: 'all',
    sort: 'updatedAt-desc',
  },
  viewMode: 'grid',
  toasts: [],
  editorBluray: emptyBlurayForm(),
  metadataSuggestion: null,
  metadataLoading: false,
  metadataMessage: '',
  scanner: {
    open: false,
    context: 'editor',
    status: 'idle',
    message: '',
    error: '',
  },
  activeBluray: null,
  currentViewMessage: '',
};

let unsubscribeBlurays = () => {};
let scannerControls = null;
let scannerStartInProgress = false;
let scannerResultHandled = false;
const pendingCoverLoads = new Set();

function parseRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash || hash === 'home') {
    return { type: 'home' };
  }
  if (['collection', 'to-buy', 'buying', 'unwatched'].includes(hash)) {
    return { type: hash };
  }
  if (hash.startsWith('blurays/')) {
    return { type: 'detail', id: decodeURIComponent(hash.slice('blurays/'.length)) };
  }
  if (hash.startsWith('editor/')) {
    return { type: 'editor', id: decodeURIComponent(hash.slice('editor/'.length)) };
  }
  return { type: 'home' };
}

function navigate(route) {
  if (['home', 'collection', 'to-buy', 'buying', 'unwatched'].includes(route)) {
    window.location.hash = `#/${route}`;
    return;
  }

  if (route.startsWith('detail:')) {
    window.location.hash = `#/blurays/${encodeURIComponent(route.slice('detail:'.length))}`;
    return;
  }

  if (route.startsWith('editor:')) {
    window.location.hash = `#/editor/${encodeURIComponent(route.slice('editor:'.length))}`;
  }
}

function showToast(type, title, message) {
  state.toasts = [...state.toasts.slice(-3), { type, title, message, id: crypto.randomUUID() }];
  scheduleRender();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    state.toasts = [];
    scheduleRender();
  }, 3500);
}

function userFriendlyFirebaseError(error) {
  const code = error?.code || '';
  const message = error?.message || 'Une erreur Firebase est survenue.';

  if (code.includes('permission-denied')) {
    return `Permission refusee par Firebase. Verifie les regles Firestore et le document membre pour ${COLLECTION_ID}.`;
  }

  if (code.includes('unauthenticated')) {
    return 'Tu dois etre connecte pour modifier la collection.';
  }

  if (code.includes('not-found')) {
    return 'Firestore ne semble pas encore cree dans Firebase Console.';
  }

  return message;
}

function setBusy(value) {
  state.busy = value;
  scheduleRender();
}

function scheduleRender() {
  if (scheduleRender.pending) {
    return;
  }

  scheduleRender.pending = true;
  window.requestAnimationFrame(() => {
    scheduleRender.pending = false;
    render();
  });
}

function setRouteFromLocation() {
  stopScanner();
  state.metadataSuggestion = null;
  state.metadataMessage = '';
  state.metadataLoading = false;
  state.route = parseRoute();
  syncActiveBluray();
  scheduleRender();
}

function syncActiveBluray() {
  if (state.route.type === 'editor' && state.route.id === 'new') {
    state.activeBluray = null;
    state.editorBluray = state.editorBluray || emptyBlurayForm();
    return;
  }

  if (state.route.type === 'detail' || state.route.type === 'editor') {
    const item = state.blurays.find((bluray) => bluray.id === state.route.id);
    state.activeBluray = item ? withCover(item) : null;
    state.editorBluray = state.route.type === 'editor' && item ? toEditorModel(item) : emptyBlurayForm();
    return;
  }

  state.activeBluray = null;
  state.editorBluray = emptyBlurayForm();
}

function withCover(bluray) {
  const cover = state.covers[bluray.id];
  return {
    ...bluray,
    coverImageUrl: cover?.imageUrl || bluray.coverExternalUrl || '',
    coverSize: cover?.size || 0,
  };
}

function queueCoverLoads(blurays) {
  const needed = blurays.filter(
    (bluray) =>
      bluray.hasCover &&
      !Object.prototype.hasOwnProperty.call(state.covers, bluray.id) &&
      !pendingCoverLoads.has(bluray.id)
  );

  for (const bluray of needed) {
    pendingCoverLoads.add(bluray.id);
    getCoverDocument(bluray.id)
      .then((cover) => {
        state.covers = {
          ...state.covers,
          [bluray.id]: cover || null,
        };
        syncActiveBluray();
        scheduleRender();
      })
      .catch((error) => {
        showToast('error', 'Jaquette', userFriendlyFirebaseError(error));
      })
      .finally(() => {
        pendingCoverLoads.delete(bluray.id);
      });
  }
}

function toEditorModel(bluray) {
  return {
    title: bluray.title || '',
    saga: bluray.saga || '',
    genre: bluray.genre || 'Action',
    year: bluray.year || '',
    director: bluray.director || '',
    status: canonicalStatus(bluray.status),
    owner: bluray.owner || 'Commun',
    location: bluray.location || '',
    barcode: bluray.barcode || '',
    rating: Number(bluray.rating || 0),
    comment: bluray.comment || '',
    coverExternalUrl: bluray.coverExternalUrl || '',
    autoFilledFromBarcode: bluray.autoFilledFromBarcode === true,
    metadataSource: bluray.metadataSource || '',
    is3D: bluray.is3D === true,
    watched: bluray.watched === true,
  };
}

function validateEditorForm(formData) {
  const payload = {
    title: String(formData.get('title') || '').trim(),
    saga: String(formData.get('saga') || '').trim(),
    genre: String(formData.get('genre') || '').trim(),
    year: String(formData.get('year') || '').trim(),
    director: String(formData.get('director') || '').trim(),
    status: String(formData.get('status') || '').trim(),
    owner: String(formData.get('owner') || '').trim(),
    location: String(formData.get('location') || '').trim(),
    barcode: String(formData.get('barcode') || '').trim(),
    rating: String(formData.get('rating') || '').trim(),
    comment: String(formData.get('comment') || '').trim(),
    coverExternalUrl: String(formData.get('coverExternalUrl') || '').trim(),
    autoFilledFromBarcode: formData.get('autoFilledFromBarcode') === 'true',
    metadataSource: String(formData.get('metadataSource') || '').trim(),
    is3D: formData.get('is3D') === 'on',
    watched: formData.get('watched') === 'on',
  };

  if (!payload.title) {
    throw new Error('Le titre est obligatoire.');
  }
  if (!payload.genre) {
    throw new Error('Le genre est obligatoire.');
  }
  if (!payload.status) {
    throw new Error('Le statut est obligatoire.');
  }
  if (!payload.owner) {
    throw new Error('Le proprietaire est obligatoire.');
  }

  const year = payload.year ? Number(payload.year) : '';
  if (payload.year && (!Number.isInteger(year) || year < 1888 || year > nextYear())) {
    throw new Error(`L annee doit etre valide (1888-${nextYear()}).`);
  }

  const rating = payload.rating === '' ? 0 : Number(payload.rating);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error('La note doit etre comprise entre 0 et 5.');
  }

  return {
    ...payload,
    status: canonicalStatus(payload.status),
    year: year === '' ? null : year,
    rating: clamp(Math.round(rating), 0, 5),
  };
}

function getFilteredBlurays() {
  const search = normalizeText(state.route.type === 'collection' ? state.filters.search : '');

  const items = state.blurays.filter((bluray) => {
    if (state.route.type === 'collection' && !isOwned(bluray)) {
      return false;
    }
    if (state.route.type === 'to-buy' && !isToBuy(bluray)) {
      return false;
    }
    if (state.route.type === 'buying' && !isBuying(bluray)) {
      return false;
    }
    if (state.route.type === 'unwatched' && (!isOwned(bluray) || bluray.watched === true)) {
      return false;
    }
    if (state.route.type === 'collection' && state.filters.genre !== 'all' && bluray.genre !== state.filters.genre) {
      return false;
    }
    if (state.route.type === 'collection' && state.filters.year !== 'all' && String(bluray.year || '') !== state.filters.year) {
      return false;
    }
    if (search && !blurayToSearchBlob(bluray).includes(search)) {
      return false;
    }
    return true;
  });

  const sorted = [...items].sort((a, b) => {
    switch (state.filters.sort) {
      case 'title-asc':
        return String(a.title || '').localeCompare(String(b.title || ''), 'fr', { sensitivity: 'base' });
      case 'rating-desc':
        return Number(b.rating || 0) - Number(a.rating || 0);
      case 'createdAt-desc':
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      case 'updatedAt-desc':
      default:
        return (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0);
    }
  });

  return sorted;
}

async function handleAuth(user) {
  state.user = user;
  state.member = null;
  state.blurays = [];
  state.covers = {};
  state.loadingBlurays = true;
  state.route = parseRoute();
  syncActiveBluray();

  unsubscribeBlurays();
  unsubscribeBlurays = () => {};

  if (!user) {
    scheduleRender();
    return;
  }

  try {
    state.member = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Membre',
    };
    unsubscribeBlurays = watchBlurays(
      (blurays) => {
        state.blurays = blurays;
        state.loadingBlurays = false;
        syncActiveBluray();
        scheduleRender();
      },
      (error) => {
        state.loadingBlurays = false;
        showToast('error', 'Lecture Firestore', error.message || 'Impossible de charger la collection.');
        scheduleRender();
      }
    );
  } catch (error) {
    state.loadingBlurays = false;
    showToast('error', 'Connexion Firebase', error.message || 'Impossible de rejoindre la collection.');
  }

  scheduleRender();
}

async function submitEditor(form) {
  const formData = new FormData(form);
  const payload = validateEditorForm(formData);
  const fileInput = form.elements.cover;
  const coverFile = fileInput?.files?.[0] || null;
  const current = state.activeBluray;
  const blurayId = state.route.id === 'new' ? crypto.randomUUID() : state.route.id;

  setBusy(true);
  try {
    const existing = current || {};
    const savedCover = coverFile
      ? await saveCoverDocument({
          blurayId,
          file: coverFile,
          userId: state.user.uid,
        })
      : null;

    if (savedCover) {
      state.covers = {
        ...state.covers,
        [blurayId]: savedCover,
      };
    }

    const data = {
      title: payload.title,
      saga: payload.saga,
      genre: payload.genre,
      year: payload.year,
      director: payload.director,
      status: payload.status,
      owner: payload.owner,
      location: payload.location,
      barcode: payload.barcode,
      rating: payload.rating,
      comment: payload.comment,
      coverExternalUrl: payload.coverExternalUrl,
      autoFilledFromBarcode: payload.autoFilledFromBarcode,
      metadataSource: payload.metadataSource,
      is3D: payload.is3D,
      watched: payload.watched,
      hasCover: Boolean(savedCover || existing.hasCover),
      createdAt: existing.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: existing.createdBy || state.user.uid,
      updatedBy: state.user.uid,
    };

    await saveBlurayDocument({ blurayId, data });
    showToast('success', 'Sauvegarde', `${payload.title} a ete enregistre.`);
    window.location.hash = `#/blurays/${encodeURIComponent(blurayId)}`;
  } catch (error) {
    showToast('error', 'Sauvegarde', userFriendlyFirebaseError(error));
  } finally {
    setBusy(false);
  }
}

async function handleDelete(blurayId) {
  const bluray = state.blurays.find((item) => item.id === blurayId);
  if (!bluray) {
    return;
  }

  const confirmDelete = window.confirm(`Supprimer "${bluray.title}" de la collection ?`);
  if (!confirmDelete) {
    return;
  }

  setBusy(true);
  try {
    if (bluray.hasCover) {
      await deleteCoverDocument(blurayId).catch(() => {});
      const nextCovers = { ...state.covers };
      delete nextCovers[blurayId];
      state.covers = nextCovers;
    }
    await removeBlurayDocument(blurayId);
    showToast('success', 'Suppression', `${bluray.title} a ete supprime.`);
    window.location.hash = '#/collection';
  } catch (error) {
    showToast('error', 'Suppression', userFriendlyFirebaseError(error));
  } finally {
    setBusy(false);
  }
}

function openEditor(id = 'new') {
  window.location.hash = `#/editor/${encodeURIComponent(id)}`;
}

function closeModal() {
  window.location.hash = '#/collection';
}

async function exportCollection() {
  const payload = {
    collectionId: COLLECTION_ID,
    collectionName: COLLECTION_NAME,
    exportedAt: new Date().toISOString(),
    blurays: state.blurays,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bluray-collection-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast('success', 'Export', 'La sauvegarde JSON a ete telechargee.');
}

async function importCollection(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const items = Array.isArray(parsed.blurays) ? parsed.blurays : Array.isArray(parsed) ? parsed : null;

  if (!items) {
    throw new Error('Le fichier JSON ne contient pas de collection valide.');
  }

  setBusy(true);
  try {
    for (const item of items) {
      const blurayId = item.id || crypto.randomUUID();
      await saveBlurayDocument({
        blurayId,
        data: {
          title: String(item.title || '').trim(),
          saga: String(item.saga || '').trim(),
          genre: String(item.genre || 'Autre').trim(),
          year: item.year ?? null,
          director: String(item.director || '').trim(),
          status: canonicalStatus(item.status),
          owner: String(item.owner || 'Commun').trim(),
          location: String(item.location || '').trim(),
          barcode: String(item.barcode || '').trim(),
          rating: clamp(Number(item.rating || 0), 0, 5),
          comment: String(item.comment || '').trim(),
          coverExternalUrl: String(item.coverExternalUrl || '').trim(),
          autoFilledFromBarcode: item.autoFilledFromBarcode === true,
          metadataSource: String(item.metadataSource || '').trim(),
          is3D: item.is3D === true,
          watched: item.watched === true,
          hasCover: Boolean(item.hasCover),
          createdAt: item.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: String(item.createdBy || state.user.uid),
          updatedBy: state.user.uid,
        },
      });
    }
    showToast('success', 'Import', `${items.length} element(s) importes.`);
  } catch (error) {
    showToast('error', 'Import', error.message || 'L import JSON a echoue.');
  } finally {
    setBusy(false);
  }
}

function resetFilters() {
  state.filters = {
    search: '',
    genre: 'all',
    year: 'all',
    sort: 'updatedAt-desc',
  };
  scheduleRender();
}

function normalizeBarcode(value) {
  return String(value || '').replace(/\D/g, '');
}

function findBlurayByBarcode(barcode) {
  const cleanBarcode = normalizeBarcode(barcode);
  if (!cleanBarcode) {
    return null;
  }

  return state.blurays.find((bluray) => normalizeBarcode(bluray.barcode) === cleanBarcode) || null;
}

function captureEditorDraft() {
  const form = document.querySelector('[data-editor-form]');
  if (!form) {
    return state.editorBluray;
  }

  const formData = new FormData(form);
  state.editorBluray = {
    ...state.editorBluray,
    title: String(formData.get('title') || ''),
    saga: String(formData.get('saga') || ''),
    genre: String(formData.get('genre') || state.editorBluray.genre || 'Action'),
    year: String(formData.get('year') || ''),
    director: String(formData.get('director') || ''),
    status: String(formData.get('status') || state.editorBluray.status || 'Possédé'),
    owner: String(formData.get('owner') || state.editorBluray.owner || 'Commun'),
    location: String(formData.get('location') || ''),
    barcode: String(formData.get('barcode') || ''),
    rating: Number(formData.get('rating') || 0),
    comment: String(formData.get('comment') || ''),
    coverExternalUrl: String(formData.get('coverExternalUrl') || ''),
    autoFilledFromBarcode: formData.get('autoFilledFromBarcode') === 'true',
    metadataSource: String(formData.get('metadataSource') || ''),
    is3D: formData.get('is3D') === 'on',
    watched: formData.get('watched') === 'on',
  };

  return state.editorBluray;
}

function stopScanner() {
  scannerControls?.stop?.();
  scannerControls = null;
  scannerStartInProgress = false;
  scannerResultHandled = false;
  state.scanner = {
    open: false,
    context: 'editor',
    status: 'idle',
    message: '',
    error: '',
  };
}

function openScanner(context = 'editor') {
  captureEditorDraft();
  scannerResultHandled = false;
  state.scanner = {
    open: true,
    context,
    status: 'starting',
    message: context === 'library'
      ? 'Scanne un Blu-ray pour vérifier ta bibliothèque.'
      : 'Place le code-barres dans le cadre.',
    error: '',
  };
  scheduleRender();
}

function closeScanner() {
  stopScanner();
  scheduleRender();
}

function ensureScannerStarted() {
  if (!state.scanner.open || scannerControls || scannerStartInProgress) {
    return;
  }

  const video = document.querySelector('#barcode-video');
  if (!video) {
    return;
  }

  const updateScannerMessage = (message, isError = false) => {
    state.scanner = {
      ...state.scanner,
      status: isError ? 'error' : 'scanning',
      message: isError ? '' : message,
      error: isError ? message : '',
    };
    const messageElement = document.querySelector('[data-scanner-message]');
    if (messageElement) {
      messageElement.textContent = message;
    }
  };

  scannerStartInProgress = true;
  startBarcodeScanner({
    video,
    onDetected: (barcode) => {
      if (scannerResultHandled) {
        return;
      }
      scannerResultHandled = true;
      handleBarcodeDetected(barcode);
    },
    onStatus: (message) => {
      updateScannerMessage(message);
    },
  })
    .then((controls) => {
      scannerControls = controls;
      scannerStartInProgress = false;
      updateScannerMessage('Place le code-barres dans le cadre.');
    })
    .catch((error) => {
      scannerStartInProgress = false;
      updateScannerMessage(error.message || 'Impossible d’ouvrir la caméra.', true);
    });
}

async function handleBarcodeDetected(barcode) {
  const cleanBarcode = normalizeBarcode(barcode);
  if (!cleanBarcode) {
    return;
  }

  navigator.vibrate?.(90);
  const scannerContext = state.scanner.context || 'editor';
  stopScanner();

  if (scannerContext === 'library') {
    const existing = findBlurayByBarcode(cleanBarcode);
    if (existing) {
      showToast('success', 'Bibliothèque', `${existing.title || 'Blu-ray'} est déjà dans ta collection.`);
      navigate(`detail:${existing.id}`);
      return;
    }

    state.metadataSuggestion = null;
    state.metadataMessage = 'Code-barres absent de ta bibliothèque. Tu peux ajouter ce Blu-ray.';
    state.metadataLoading = false;
    state.editorBluray = {
      ...emptyBlurayForm(),
      barcode: cleanBarcode,
    };
    showToast('warning', 'Bibliothèque', 'Code-barres non trouvé dans ta collection.');
    openEditor('new');
    return;
  }

  state.editorBluray = {
    ...captureEditorDraft(),
    barcode: cleanBarcode,
  };
  showToast('success', 'Code-barres', `${cleanBarcode} scanné.`);
  await lookupMetadataForBarcode(cleanBarcode);
}

async function lookupMetadataForBarcode(barcode) {
  const cleanBarcode = normalizeBarcode(barcode);
  if (!cleanBarcode) {
    showToast('warning', 'Code-barres', 'Renseigne ou scanne un code-barres avant la recherche.');
    return;
  }

  state.metadataLoading = true;
  state.metadataSuggestion = null;
  state.metadataMessage = 'Recherche automatique des informations...';
  state.editorBluray = {
    ...captureEditorDraft(),
    barcode: cleanBarcode,
  };
  scheduleRender();

  try {
    const suggestion = await lookupBarcodeMetadata(cleanBarcode);
    if (!suggestion) {
      state.metadataMessage = 'Code-barres scanné, mais aucune fiche automatique trouvée.';
      showToast('warning', 'Recherche', state.metadataMessage);
      return;
    }

    state.metadataSuggestion = suggestion;
    state.metadataMessage = 'Fiche trouvée. Vérifie puis utilise les infos si elles sont correctes.';
    showToast('success', 'Recherche', 'Une fiche automatique a été trouvée.');
  } catch (error) {
    state.metadataMessage = error.message || 'Recherche automatique indisponible.';
    showToast('warning', 'Recherche', state.metadataMessage);
  } finally {
    state.metadataLoading = false;
    scheduleRender();
  }
}

async function lookupMetadataForTitle(title) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) {
    showToast('warning', 'TMDB', 'Renseigne un titre avant de chercher sur TMDB.');
    return;
  }

  state.metadataLoading = true;
  state.metadataSuggestion = null;
  state.metadataMessage = 'Recherche TMDB en cours...';
  state.editorBluray = {
    ...captureEditorDraft(),
    title: cleanTitle,
  };
  scheduleRender();

  try {
    const suggestion = await searchTitleMetadata(cleanTitle);
    if (!suggestion) {
      state.metadataMessage = 'Aucune fiche TMDB trouvée pour ce titre.';
      showToast('warning', 'TMDB', state.metadataMessage);
      return;
    }

    state.metadataSuggestion = {
      ...suggestion,
      barcode: state.editorBluray.barcode || '',
    };
    state.metadataMessage = 'Fiche TMDB trouvée. Vérifie puis utilise les infos.';
    showToast('success', 'TMDB', 'Une fiche film a été trouvée.');
  } catch (error) {
    state.metadataMessage = error.message || 'Recherche TMDB indisponible.';
    showToast('warning', 'TMDB', state.metadataMessage);
  } finally {
    state.metadataLoading = false;
    scheduleRender();
  }
}

function applyMetadataSuggestion() {
  if (!state.metadataSuggestion) {
    return;
  }

  const draft = captureEditorDraft();
  const suggestion = state.metadataSuggestion;
  state.editorBluray = {
    ...draft,
    title: suggestion.title || draft.title,
    genre: suggestion.genre || draft.genre,
    year: suggestion.year || draft.year,
    director: suggestion.director || draft.director,
    comment: suggestion.comment || draft.comment,
    barcode: suggestion.barcode || draft.barcode,
    coverExternalUrl: suggestion.coverExternalUrl || draft.coverExternalUrl,
    autoFilledFromBarcode: suggestion.autoFilledFromBarcode === true,
    metadataSource: suggestion.metadataSource || draft.metadataSource,
  };
  state.metadataSuggestion = null;
  state.metadataMessage = 'Infos appliquées. Tu peux encore modifier avant d’enregistrer.';
  showToast('success', 'Préremplissage', 'Les informations ont été appliquées au formulaire.');
  scheduleRender();
}

function render() {
  const filteredBlurays = getFilteredBlurays().map(withCover);
  const summary = computeStats(state.blurays);
  const yearOptions = [...new Set(state.blurays.map((item) => item.year).filter(Boolean).map(String))].sort((a, b) => Number(b) - Number(a));
  const activeElement = document.activeElement;
  const activeSearch =
    activeElement && activeElement.id === 'search'
      ? {
          start: activeElement.selectionStart,
          end: activeElement.selectionEnd,
          direction: activeElement.selectionDirection,
        }
      : null;

  const appState = {
    ...state,
    filteredBlurays,
    summary,
    yearOptions,
  };

  appRoot.innerHTML = state.user
    ? `
      ${renderAppState(appState)}
      ${renderAppOverlays(appState)}
    `
    : `
      <div class="page-frame">
        ${renderAuthScreen({
          configured: state.configReady,
          missingKeys: state.configMissingKeys,
          busy: state.busy,
        })}
      </div>
    `;

  toastRoot.innerHTML = renderToastStack(state.toasts);
  document.title = state.user ? `${APP_NAME} (${filteredBlurays.length})` : APP_NAME;

  const searchInput = document.querySelector('#search');
  if (searchInput) {
    searchInput.value = state.filters.search;
  }

  const genreSelect = document.querySelector('#genre');
  if (genreSelect) {
    genreSelect.value = state.filters.genre;
  }

  const yearSelect = document.querySelector('#year');
  if (yearSelect) {
    yearSelect.value = state.filters.year;
  }

  const sortSelect = document.querySelector('#sort');
  if (sortSelect) {
    sortSelect.value = state.filters.sort;
  }

  if (activeSearch && searchInput) {
    searchInput.focus({ preventScroll: true });
    if (typeof activeSearch.start === 'number' && typeof activeSearch.end === 'number') {
      searchInput.setSelectionRange(activeSearch.start, activeSearch.end, activeSearch.direction || 'none');
    }
  }

  if (state.route.type === 'detail' && !state.activeBluray && !state.loadingBlurays && state.blurays.length) {
    showToast('warning', 'Detail introuvable', 'Le Blu-ray demande n existe plus.');
    closeModal();
  }

  if (state.route.type !== 'home') {
    queueCoverLoads(filteredBlurays);
  }
  if (state.activeBluray?.hasCover) {
    queueCoverLoads([state.activeBluray]);
  }

  if (state.scanner.open) {
    window.setTimeout(ensureScannerStarted, 0);
  }
}

function handleDocumentClick(event) {
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) {
    const overlay = event.target.closest('[data-close-overlay="true"]');
    if (overlay && event.target === overlay) {
      stopScanner();
      closeModal();
    }
    return;
  }

  const action = actionButton.dataset.action;

  if (action === 'navigate') {
    navigate(actionButton.dataset.route || 'home');
    return;
  }
  if (action === 'set-view-mode') {
    state.viewMode = actionButton.dataset.viewMode === 'list' ? 'list' : 'grid';
    scheduleRender();
    return;
  }
  if (action === 'logout') {
    logoutUser().catch((error) => showToast('error', 'Deconnexion', error.message));
    return;
  }
  if (action === 'google-login') {
    setBusy(true);
    loginWithGoogle()
      .catch((error) => showToast('error', 'Google Auth', error.message))
      .finally(() => setBusy(false));
    return;
  }
  if (action === 'open-editor') {
    state.metadataSuggestion = null;
    state.metadataMessage = '';
    state.metadataLoading = false;
    state.editorBluray = emptyBlurayForm();
    openEditor('new');
    return;
  }
  if (action === 'open-scanner') {
    openScanner('editor');
    return;
  }
  if (action === 'open-library-scanner') {
    openScanner('library');
    return;
  }
  if (action === 'close-scanner') {
    closeScanner();
    return;
  }
  if (action === 'lookup-barcode') {
    const draft = captureEditorDraft();
    lookupMetadataForBarcode(draft.barcode);
    return;
  }
  if (action === 'lookup-title') {
    const draft = captureEditorDraft();
    lookupMetadataForTitle(draft.title);
    return;
  }
  if (action === 'apply-metadata') {
    applyMetadataSuggestion();
    return;
  }
  if (action === 'close-modal') {
    stopScanner();
    closeModal();
    return;
  }
  if (action === 'reset-filters') {
    resetFilters();
    return;
  }
  if (action === 'export-json') {
    exportCollection().catch((error) => showToast('error', 'Export', error.message));
    return;
  }
  if (action === 'import-json') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      importCollection(file).catch((error) => showToast('error', 'Import', error.message));
    });
    input.click();
    return;
  }
  if (action === 'open-detail') {
    const id = actionButton.dataset.id;
    if (id) {
      navigate(`detail:${id}`);
    }
    return;
  }
  if (action === 'edit') {
    const id = actionButton.dataset.id;
    if (id) {
      state.metadataSuggestion = null;
      state.metadataMessage = '';
      state.metadataLoading = false;
      navigate(`editor:${id}`);
    }
    return;
  }
  if (action === 'delete') {
    const id = actionButton.dataset.id;
    if (id) {
      handleDelete(id);
    }
    return;
  }
}

function handleDocumentSubmit(event) {
  const authForm = event.target.closest('[data-auth-form]');
  if (authForm) {
    event.preventDefault();
    const mode = event.submitter?.dataset.mode || 'login';
    const formData = new FormData(authForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();
    const displayName = String(formData.get('displayName') || '').trim();

    setBusy(true);
    const promise = mode === 'register'
      ? registerWithEmail({ email, password, displayName })
      : loginWithEmail({ email, password });

    promise
      .then(() => showToast('success', 'Connexion', 'Session ouverte.'))
      .catch((error) => showToast('error', 'Connexion', error.message))
      .finally(() => setBusy(false));
    return;
  }

  const editorForm = event.target.closest('[data-editor-form]');
  if (editorForm) {
    event.preventDefault();
    submitEditor(editorForm);
  }
}

function handleDocumentInput(event) {
  const target = event.target;

  if (target?.id === 'search') {
    state.filters.search = target.value;
    scheduleRender();
    return;
  }
  if (target?.id === 'genre') {
    state.filters.genre = target.value;
    scheduleRender();
    return;
  }
  if (target?.id === 'year') {
    state.filters.year = target.value;
    scheduleRender();
    return;
  }
  if (target?.id === 'sort') {
    state.filters.sort = target.value;
    scheduleRender();
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape' && state.scanner.open) {
    closeScanner();
    return;
  }
  if (event.key === 'Escape' && state.user && ['detail', 'editor'].includes(state.route.type)) {
    stopScanner();
    navigate('collection');
  }
}

async function initCollectionMeta() {
  if (!db || !state.user) {
    return;
  }

  try {
    await setDoc(doc(db, 'collections', COLLECTION_ID), {
      name: COLLECTION_NAME,
      collectionId: COLLECTION_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch {
    // Optional metadata. Ignore if permissions do not allow it.
  }
}

async function boot() {
  if (!auth) {
    state.ready = true;
    render();
    return;
  }

  window.addEventListener('hashchange', setRouteFromLocation);
  window.addEventListener('online', () => {
    state.offline = false;
    scheduleRender();
  });
  window.addEventListener('offline', () => {
    state.offline = true;
    scheduleRender();
  });

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('submit', handleDocumentSubmit);
  document.addEventListener('input', handleDocumentInput);
  document.addEventListener('keydown', handleKeydown);

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`).catch(() => {});
  }

  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  await initAuth(async (user, meta) => {
    state.ready = true;
    if (!meta.configured) {
      state.user = null;
      state.loadingBlurays = false;
      render();
      return;
    }

    await handleAuth(user);
    if (user) {
      initCollectionMeta().catch(() => {});
    }
    render();
  }, (error) => {
    showToast('error', 'Auth', error.message || 'Authentication Firebase indisponible.');
  });

  if (!window.location.hash) {
    window.location.hash = '#/home';
  } else {
    setRouteFromLocation();
  }
}

boot().catch((error) => {
  state.ready = true;
  state.currentViewMessage = error.message || 'Une erreur est survenue.';
  showToast('error', 'Demarrage', state.currentViewMessage);
  render();
});
