import { GENRE_OPTIONS, normalizeText } from './utils';

const UPC_LOOKUP_URL = 'https://api.upcitemdb.com/prod/trial/lookup';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const TMDB_GENRE_TO_APP_GENRE = {
  28: 'Action',
  12: 'Aventure',
  16: 'Animation',
  35: 'Comédie',
  80: 'Crime',
  99: 'Documentaire',
  18: 'Drame',
  10751: 'Animation',
  14: 'Fantasy',
  36: 'Historique',
  27: 'Horreur',
  10402: 'Musical',
  9648: 'Thriller',
  10749: 'Romance',
  878: 'Science-fiction',
  10770: 'Autre',
  53: 'Thriller',
  10752: 'Guerre',
  37: 'Western',
};

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanProductTitle(value) {
  return compact(value)
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/\([^)]*(blu-ray|bluray|dvd|4k|uhd|digital)[^)]*\)/gi, ' ')
    .replace(/\b(blu[-\s]?ray|dvd|4k|uhd|ultra hd|steelbook|edition collector|collector|digital copy)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function yearFromDate(value) {
  const match = String(value || '').match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function appGenreFromTmdb(movie) {
  const genreIds = Array.isArray(movie?.genre_ids)
    ? movie.genre_ids
    : Array.isArray(movie?.genres)
      ? movie.genres.map((genre) => genre.id)
      : [];
  const tmdbGenre = genreIds.map((id) => TMDB_GENRE_TO_APP_GENRE[id]).find(Boolean);
  return GENRE_OPTIONS.includes(tmdbGenre) ? tmdbGenre : '';
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Recherche externe indisponible (${response.status}).`);
  }
  return response.json();
}

async function lookupUpcItemDb(barcode) {
  const url = `${UPC_LOOKUP_URL}?upc=${encodeURIComponent(barcode)}`;
  const data = await fetchJson(url);
  const item = Array.isArray(data.items) ? data.items[0] : null;

  if (!item) {
    return null;
  }

  const image = Array.isArray(item.images) ? item.images.find(Boolean) : '';
  const title = cleanProductTitle(item.title || item.description || '');

  return {
    title,
    rawTitle: compact(item.title || ''),
    comment: compact(item.description || ''),
    coverExternalUrl: image || '',
    source: 'UPCitemdb',
  };
}

async function searchTmdbMovie(title) {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  if (!apiKey || !title) {
    return null;
  }

  const searchParams = new URLSearchParams({
    api_key: apiKey,
    language: 'fr-FR',
    query: title,
    include_adult: 'false',
  });
  const searchData = await fetchJson(`${TMDB_BASE_URL}/search/movie?${searchParams.toString()}`);
  const normalizedTitle = normalizeText(title);
  const results = Array.isArray(searchData.results) ? searchData.results : [];
  const movie =
    results.find((item) => normalizeText(item.title) === normalizedTitle || normalizeText(item.original_title) === normalizedTitle) ||
    results[0];

  if (!movie?.id) {
    return null;
  }

  const detailsParams = new URLSearchParams({
    api_key: apiKey,
    language: 'fr-FR',
    append_to_response: 'credits',
  });
  const details = await fetchJson(`${TMDB_BASE_URL}/movie/${movie.id}?${detailsParams.toString()}`);
  const director = details.credits?.crew?.find((person) => person.job === 'Director')?.name || '';
  const posterPath = details.poster_path || movie.poster_path || '';

  return {
    title: compact(details.title || movie.title || title),
    year: yearFromDate(details.release_date || movie.release_date),
    genre: appGenreFromTmdb(details) || appGenreFromTmdb(movie) || 'Autre',
    director: compact(director),
    comment: compact(details.overview || movie.overview || ''),
    coverExternalUrl: posterPath ? `${TMDB_IMAGE_BASE_URL}${posterPath}` : '',
    source: 'TMDB',
  };
}

export async function searchTitleMetadata(title) {
  const cleanTitle = cleanProductTitle(title);
  if (!cleanTitle) {
    return null;
  }

  if (!import.meta.env.VITE_TMDB_API_KEY) {
    throw new Error('Clé TMDB non configurée. Ajoute VITE_TMDB_API_KEY dans .env et GitHub Secrets.');
  }

  const tmdbData = await searchTmdbMovie(cleanTitle);
  if (!tmdbData) {
    return null;
  }

  return {
    ...tmdbData,
    barcode: '',
    autoFilledFromBarcode: false,
    metadataSource: 'TMDB',
  };
}

export async function lookupBarcodeMetadata(barcode) {
  const cleanBarcode = String(barcode || '').replace(/\D/g, '');
  if (!cleanBarcode) {
    return null;
  }

  let upcData = null;
  let tmdbData = null;

  try {
    upcData = await lookupUpcItemDb(cleanBarcode);
  } catch {
    upcData = null;
  }

  const titleForSearch = upcData?.title || upcData?.rawTitle || '';
  try {
    tmdbData = await searchTmdbMovie(titleForSearch);
  } catch {
    tmdbData = null;
  }

  if (!upcData && !tmdbData) {
    return null;
  }

  const metadataSource = [upcData?.source, tmdbData?.source].filter(Boolean).join(' + ');

  return {
    barcode: cleanBarcode,
    title: tmdbData?.title || upcData?.title || '',
    year: tmdbData?.year || null,
    genre: tmdbData?.genre || 'Autre',
    director: tmdbData?.director || '',
    comment: tmdbData?.comment || upcData?.comment || '',
    coverExternalUrl: tmdbData?.coverExternalUrl || upcData?.coverExternalUrl || '',
    autoFilledFromBarcode: true,
    metadataSource,
  };
}
