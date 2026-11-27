import type { EnrichedBookMetadata } from '../../types/book';

const CACHE_STORAGE_KEY = 'lmp_book_metadata_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

export interface CachedBookRecord extends EnrichedBookMetadata {
  googleCoverUrl?: string | null;
}

type CacheMap = Record<string, CachedBookRecord>;

let memoryCache: CacheMap | null = null;

function cleanIsbnKey(isbn: string): string {
  return isbn.replace(/\D/g, '');
}

function readStorageMap(): CacheMap {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    memoryCache = {};
    return memoryCache;
  }

  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) {
      memoryCache = {};
      return memoryCache;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      memoryCache = parsed as CacheMap;
      return memoryCache;
    }
  } catch {
    // Stockage inaccessible ou JSON invalide : repli sur cache mémoire vide
  }

  memoryCache = {};
  return memoryCache;
}

function writeStorageMap(map: CacheMap): void {
  memoryCache = map;
  if (typeof window === 'undefined' || !('localStorage' in window)) return;

  try {
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Quota dépassé : purge des entrées les plus anciennes puis nouvelle tentative
    try {
      const entries = Object.entries(map).sort(
        (a, b) => (b[1].fetchedAt ?? 0) - (a[1].fetchedAt ?? 0)
      );
      const trimmed = Object.fromEntries(entries.slice(0, 60));
      memoryCache = trimmed;
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Silencieux si le navigateur bloque localStorage
    }
  }
}

export function getCachedBookMetadata(isbn13: string): CachedBookRecord | null {
  const key = cleanIsbnKey(isbn13);
  if (!key) return null;
  const map = readStorageMap();
  const entry = map[key];
  if (!entry) return null;

  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    return null;
  }

  return entry;
}

export function setCachedBookMetadata(record: CachedBookRecord): void {
  const key = cleanIsbnKey(record.isbn_13);
  if (!key) return;
  const map = readStorageMap();
  const next: CacheMap = {
    ...map,
    [key]: {
      ...record,
      isbn_13: key,
    },
  };
  writeStorageMap(next);
}

/**
 * Met à jour uniquement le résultat final de la couverture dans localStorage
 * (local, openlibrary, googlebooks ou typographic) sans écraser les autres métadonnées.
 */
export function updateCachedCoverOutcome(
  isbn13: string,
  coverUrl: string | null,
  coverSource: 'local' | 'openlibrary' | 'googlebooks' | 'typographic'
): CachedBookRecord | null {
  const key = cleanIsbnKey(isbn13);
  if (!key) return null;

  const existing = getCachedBookMetadata(key);
  const updated: CachedBookRecord = existing
    ? {
        ...existing,
        coverUrl,
        coverSource,
        fetchedAt: existing.fetchedAt || Date.now(),
      }
    : {
        isbn_13: key,
        coverUrl,
        googleCoverUrl: coverSource === 'googlebooks' ? coverUrl : null,
        coverSource,
        synopsis: null,
        publisher: null,
        publishYear: null,
        metadataSource: 'none',
        fetchedAt: Date.now(),
      };

  setCachedBookMetadata(updated);
  return updated;
}

export function getAllCachedMetadata(): Record<string, CachedBookRecord> {
  return { ...readStorageMap() };
}

export function clearBookMetadataCache(): void {
  memoryCache = {};
  if (typeof window === 'undefined' || !('localStorage' in window)) return;
  try {
    window.localStorage.removeItem(CACHE_STORAGE_KEY);
  } catch {
    // Silencieux
  }
}
