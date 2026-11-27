import {
  getCachedBookMetadata,
  setCachedBookMetadata,
  type CachedBookRecord,
} from './metadataCache';

const REQUEST_TIMEOUT_MS = 8000;

const inFlightRequests = new Map<string, Promise<CachedBookRecord>>();

/**
 * Nettoie un ISBN en ne conservant uniquement que les chiffres.
 */
export function sanitizeIsbn(rawIsbn: string): string {
  return rawIsbn.replace(/\D/g, '');
}

export function getLocalCoverUrl(isbn13: string): string {
  const cleanIsbn = sanitizeIsbn(isbn13);
  return `/covers/${cleanIsbn}.jpg`;
}

export function getOpenLibraryCoverUrl(isbn13: string): string {
  const cleanIsbn = sanitizeIsbn(isbn13);
  return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg?default=false`;
}

function normalizeHttpToHttps(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, 'https://').replace(/&edge=curl/gi, '');
}

function extractYear(rawDate: string | undefined): string | null {
  if (!rawDate) return null;
  const match = rawDate.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return match ? match[1] : null;
}

function cleanSynopsis(raw: string | undefined): string | null {
  if (!raw) return null;
  const stripped = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length > 0 ? stripped : null;
}

async function fetchWithTimeout(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface OpenLibraryDataResult {
  publisher: string | null;
  publishYear: string | null;
  synopsis: string | null;
  coverUrl: string | null;
}

async function queryOpenLibrary(cleanIsbn: string): Promise<OpenLibraryDataResult> {
  const empty: OpenLibraryDataResult = {
    publisher: null,
    publishYear: null,
    synopsis: null,
    coverUrl: null,
  };

  if (!cleanIsbn) return empty;

  try {
    const apiUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`;
    const response = await fetchWithTimeout(apiUrl);
    if (!response.ok) return empty;

    const json = (await response.json()) as Record<
      string,
      {
        publishers?: Array<{ name?: string }>;
        publish_date?: string;
        excerpts?: Array<{ text?: string }>;
        notes?: string | { value?: string };
        cover?: { large?: string; medium?: string };
      }
    >;

    const entry = json[`ISBN:${cleanIsbn}`];
    if (!entry) return empty;

    const publisher = entry.publishers?.[0]?.name?.trim() || null;
    const publishYear = extractYear(entry.publish_date);
    const notesText =
      typeof entry.notes === 'string' ? entry.notes : entry.notes?.value;
    let synopsis = cleanSynopsis(entry.excerpts?.[0]?.text ?? notesText);
    const coverUrl = normalizeHttpToHttps(entry.cover?.large ?? entry.cover?.medium);

    if (!synopsis) {
      try {
        const editionRes = await fetchWithTimeout(
          `https://openlibrary.org/isbn/${cleanIsbn}.json`,
          5000
        );
        if (editionRes.ok) {
          const editionData = (await editionRes.json()) as {
            description?: string | { value?: string };
            works?: Array<{ key?: string }>;
          };
          const edDesc =
            typeof editionData.description === 'string'
              ? editionData.description
              : editionData.description?.value;
          synopsis = cleanSynopsis(edDesc);

          const workKey = editionData.works?.[0]?.key;
          if (!synopsis && workKey) {
            const workRes = await fetchWithTimeout(
              `https://openlibrary.org${workKey}.json`,
              5000
            );
            if (workRes.ok) {
              const workData = (await workRes.json()) as {
                description?: string | { value?: string };
              };
              const workDesc =
                typeof workData.description === 'string'
                  ? workData.description
                  : workData.description?.value;
              synopsis = cleanSynopsis(workDesc);
            }
          }
        }
      } catch {
        // Ignorer l'échec secondaire ; Google Books prendra le relais
      }
    }

    return {
      publisher,
      publishYear,
      synopsis,
      coverUrl,
    };
  } catch {
    return empty;
  }
}

interface GoogleBooksDataResult {
  publisher: string | null;
  publishYear: string | null;
  synopsis: string | null;
  googleCoverUrl: string | null;
}

export async function queryGoogleBooks(rawIsbn: string): Promise<GoogleBooksDataResult> {
  const cleanIsbn = sanitizeIsbn(rawIsbn);
  const empty: GoogleBooksDataResult = {
    publisher: null,
    publishYear: null,
    synopsis: null,
    googleCoverUrl: null,
  };

  if (!cleanIsbn) return empty;

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) return empty;

    const json = (await response.json()) as {
      items?: Array<{
        volumeInfo?: {
          description?: string;
          publisher?: string;
          publishedDate?: string;
          imageLinks?: {
            large?: string;
            medium?: string;
            thumbnail?: string;
            smallThumbnail?: string;
          };
        };
      }>;
    };

    const info = json.items?.[0]?.volumeInfo;
    if (!info) return empty;

    return {
      publisher: info.publisher?.trim() || null,
      publishYear: extractYear(info.publishedDate),
      synopsis: cleanSynopsis(info.description),
      googleCoverUrl: normalizeHttpToHttps(
        info.imageLinks?.large ??
          info.imageLinks?.medium ??
          info.imageLinks?.thumbnail ??
          info.imageLinks?.smallThumbnail
      ),
    };
  } catch {
    return empty;
  }
}

/**
 * Enrichit les métadonnées d'un livre à partir de son ISBN-13 nettoyé :
 * 1. Lecture du cache localStorage
 * 2. Interrogation d'Open Library puis fallback Google Books
 * 3. Persistance dans localStorage (sans écraser une résolution de couverture déjà validée)
 */
export async function fetchEnrichedBookMetadata(
  rawIsbn: string
): Promise<CachedBookRecord> {
  const cleanIsbn = sanitizeIsbn(rawIsbn);
  const cached = getCachedBookMetadata(cleanIsbn);

  // Si les métadonnées API ont déjà été récupérées, on renvoie directement le cache
  if (cached && (cached.metadataSource !== 'none' || cached.googleCoverUrl !== undefined)) {
    return cached;
  }

  const existingPromise = inFlightRequests.get(cleanIsbn);
  if (existingPromise) return existingPromise;

  const task = (async (): Promise<CachedBookRecord> => {
    const ol = await queryOpenLibrary(cleanIsbn);

    const needsGoogleFallback =
      !ol.synopsis || !ol.publisher || !ol.publishYear || !ol.coverUrl;
    const gb = needsGoogleFallback
      ? await queryGoogleBooks(cleanIsbn)
      : {
          publisher: null,
          publishYear: null,
          synopsis: null,
          googleCoverUrl: null,
        };

    const synopsis = ol.synopsis ?? gb.synopsis;
    const publisher = ol.publisher ?? gb.publisher;
    const publishYear = ol.publishYear ?? gb.publishYear;

    // On relit le cache juste avant d'écrire au cas où BookCover aurait déjà résolu la couverture
    const latestCached = getCachedBookMetadata(cleanIsbn);
    const hasResolvedCover =
      latestCached &&
      latestCached.coverSource !== 'none';

    const coverUrl = hasResolvedCover ? latestCached.coverUrl : null;
    const coverSource: CachedBookRecord['coverSource'] = hasResolvedCover
      ? latestCached.coverSource
      : 'none';

    const metadataSource: CachedBookRecord['metadataSource'] = ol.synopsis
      ? 'openlibrary'
      : gb.synopsis || gb.publisher || gb.publishYear
      ? 'googlebooks'
      : publisher || publishYear
      ? 'openlibrary'
      : 'none';

    const record: CachedBookRecord = {
      isbn_13: cleanIsbn,
      coverUrl,
      googleCoverUrl: gb.googleCoverUrl ?? latestCached?.googleCoverUrl ?? null,
      coverSource,
      synopsis,
      publisher,
      publishYear,
      metadataSource,
      fetchedAt: Date.now(),
    };

    setCachedBookMetadata(record);
    return record;
  })();

  inFlightRequests.set(cleanIsbn, task);
  try {
    return await task;
  } finally {
    inFlightRequests.delete(cleanIsbn);
  }
}
