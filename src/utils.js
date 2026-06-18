export const COLLECTION_ID = 'maison-mathieu-quentin';
export const APP_NAME = 'Lovebluray';
export const COLLECTION_NAME = 'Lovebluray';

export const STATUS_OPTIONS = ['Possédé', 'À acheter', "En cours d'achat"];
export const OWNER_OPTIONS = ['Mathieu', 'Quentin', 'Commun'];
export const GENRE_OPTIONS = [
  'Action',
  'Aventure',
  'Animation',
  'Biopic',
  'Comédie',
  'Comédie dramatique',
  'Comédie romantique',
  'Crime',
  'Documentaire',
  'Drame',
  'Espionnage',
  'Fantastique',
  'Fantasy',
  'Guerre',
  'Historique',
  'Horreur',
  'Musical',
  'Policier',
  'Romance',
  'Science-fiction',
  'Super-héros',
  'Thriller',
  'Western',
  'Autre',
];
export const SORT_OPTIONS = [
  { value: 'updatedAt-desc', label: 'Dernière modification' },
  { value: 'createdAt-desc', label: "Date d'ajout" },
  { value: 'title-asc', label: 'Titre A-Z' },
  { value: 'rating-desc', label: 'Note décroissante' },
];

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function canonicalStatus(value) {
  const normalized = normalizeText(value);
  if (normalized === 'possede' || normalized === 'vu' || normalized === 'non vu' || normalized === 'prete') {
    return 'Possédé';
  }
  if (normalized === 'a acheter') {
    return 'À acheter';
  }
  if (normalized === "en cours d'achat" || normalized === 'en cours d achat') {
    return "En cours d'achat";
  }
  return String(value || 'Possédé');
}

export function isOwned(bluray) {
  return canonicalStatus(bluray.status) === 'Possédé';
}

export function isToBuy(bluray) {
  return canonicalStatus(bluray.status) === 'À acheter';
}

export function isBuying(bluray) {
  return canonicalStatus(bluray.status) === "En cours d'achat";
}

export function toDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateParts(value, options) {
  const date = toDate(value);
  if (!date) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

export function formatDate(value) {
  return formatDateParts(value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  return formatDateParts(value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatYear(value) {
  const year = Number(value);
  return Number.isFinite(year) && year > 0 ? String(year) : '—';
}

export function ratingStars(value) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);
}

export function getInitials(value) {
  return String(value ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatLabel(value) {
  return canonicalStatus(value);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function nextYear() {
  return new Date().getFullYear() + 1;
}

export function emptyBlurayForm() {
  return {
    title: '',
    saga: '',
    genre: 'Action',
    year: '',
    director: '',
    status: 'Possédé',
    owner: 'Commun',
    location: '',
    barcode: '',
    rating: 0,
    comment: '',
    is3D: false,
    watched: false,
  };
}

export function blurayToSearchBlob(bluray) {
  return normalizeText(
    [
      bluray.title,
      bluray.saga,
      bluray.genre,
      bluray.director,
      bluray.status,
      bluray.owner,
      bluray.location,
      bluray.barcode,
      bluray.comment,
    ]
      .filter(Boolean)
      .join(' ')
  );
}
