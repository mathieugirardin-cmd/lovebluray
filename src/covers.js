import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTION_ID } from './utils';

const TARGET_BYTES = 120 * 1024;
const FIRESTORE_IMAGE_DATA_LIMIT = 850 * 1024;

function coverDocRef(blurayId) {
  return db ? doc(db, 'collections', COLLECTION_ID, 'covers', blurayId) : null;
}

function dataUrlToBase64(dataUrl) {
  return String(dataUrl).split(',')[1] || '';
}

function bytesToDataUrl(bytes, mimeType) {
  return `data:${mimeType};base64,${bytes}`;
}

async function loadImageSource(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Impossible de lire la jaquette.'));
      element.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('La compression de la jaquette a echoue.'));
      },
      mimeType,
      quality
    );
  });
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(dataUrlToBase64(reader.result));
    reader.onerror = () => reject(new Error('Impossible de convertir la jaquette.'));
    reader.readAsDataURL(blob);
  });
}

async function supportsWebp() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const blob = await canvasToBlob(canvas, 'image/webp', 0.8).catch(() => null);
  return Boolean(blob && blob.type === 'image/webp');
}

export async function compressCoverFile(file) {
  const source = await loadImageSource(file);
  const mimeType = (await supportsWebp()) ? 'image/webp' : 'image/jpeg';
  let maxSide = 720;
  let quality = 0.78;
  let bestBlob = null;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const ratio = Math.min(1, maxSide / Math.max(source.naturalWidth, source.naturalHeight));
    const width = Math.max(1, Math.round(source.naturalWidth * ratio));
    const height = Math.max(1, Math.round(source.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Impossible de preparer la jaquette.');
    }

    context.fillStyle = '#08111d';
    context.fillRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    bestBlob = await canvasToBlob(canvas, mimeType, quality);

    if (bestBlob.size <= TARGET_BYTES) {
      break;
    }

    if (quality > 0.5) {
      quality -= 0.08;
    } else {
      maxSide = Math.max(320, Math.round(maxSide * 0.82));
      quality = 0.72;
    }
  }

  if (!bestBlob) {
    throw new Error('La jaquette reste trop lourde pour Firestore. Essaie une image plus petite.');
  }

  const imageData = await blobToBase64(bestBlob);
  if (imageData.length > FIRESTORE_IMAGE_DATA_LIMIT) {
    throw new Error('La jaquette reste trop lourde pour Firestore. Essaie une image plus petite.');
  }

  return {
    imageData,
    mimeType,
    size: bestBlob.size,
  };
}

export async function getCoverDocument(blurayId) {
  if (!db || !blurayId) {
    return null;
  }

  const snapshot = await getDoc(coverDocRef(blurayId));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    blurayId,
    imageData: data.imageData || '',
    imageUrl: data.imageData ? bytesToDataUrl(data.imageData, data.mimeType || 'image/jpeg') : '',
    mimeType: data.mimeType || 'image/jpeg',
    size: data.size || 0,
  };
}

export async function saveCoverDocument({ blurayId, file, userId }) {
  if (!db || !file) {
    return null;
  }

  const compressed = await compressCoverFile(file);
  await setDoc(coverDocRef(blurayId), {
    blurayId,
    imageData: compressed.imageData,
    mimeType: compressed.mimeType,
    size: compressed.size,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });

  return {
    ...compressed,
    blurayId,
    imageUrl: bytesToDataUrl(compressed.imageData, compressed.mimeType),
  };
}

export async function deleteCoverDocument(blurayId) {
  if (!db || !blurayId) {
    return;
  }

  await deleteDoc(coverDocRef(blurayId));
}
