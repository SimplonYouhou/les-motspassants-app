import type { SavedBookEntry } from '../../types/book';

/**
 * Point d'accès unique à IndexedDB pour Les MotsPassants.
 * Règle absolue :
 * - Aucune écriture avant l'accord explicite du lecteur.
 * - Les réponses au questionnaire ne sont jamais enregistrées.
 */

const DB_NAME = 'les_motspassants_local';
const DB_VERSION = 1;
const STORE_META = 'meta';
const STORE_MATCHES = 'matches';
const STORE_FAVORITES = 'favorites';
const CONSENT_KEY = 'storage_consent';

export interface LocalLibraryState {
  consentGranted: boolean;
  matches: SavedBookEntry[];
  favorites: SavedBookEntry[];
}

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Vérifie si la base IndexedDB existe déjà sans la créer.
 * Permet de garantir qu'aucune écriture ni création de base n'a lieu avant consentement.
 */
async function databaseExists(): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false;
  if (typeof indexedDB.databases === 'function') {
    try {
      const list = await indexedDB.databases();
      return list.some((db) => db.name === DB_NAME);
    } catch {
      return false;
    }
  }
  return false;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_MATCHES)) {
        db.createObjectStore(STORE_MATCHES, { keyPath: 'bookId' });
      }
      if (!db.objectStoreNames.contains(STORE_FAVORITES)) {
        db.createObjectStore(STORE_FAVORITES, { keyPath: 'bookId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readAllFromStore<T>(
  db: IDBDatabase,
  storeName: string
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

function readMetaValue<T>(
  db: IDBDatabase,
  key: string
): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const store = tx.objectStore(STORE_META);
    const req = store.get(key);
    req.onsuccess = () => {
      const result = req.result as { key: string; value: T } | undefined;
      resolve(result ? result.value : null);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Charge l'état local uniquement si une base avec consentement existe déjà.
 * Ne crée jamais la base si le lecteur n'a pas encore donné son accord.
 */
export async function loadLocalLibraryIfConsented(): Promise<LocalLibraryState> {
  const exists = await databaseExists();
  if (!exists) {
    return { consentGranted: false, matches: [], favorites: [] };
  }

  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    const consent = await readMetaValue<boolean>(db, CONSENT_KEY);
    if (!consent) {
      db.close();
      await clearAllLocalData();
      return { consentGranted: false, matches: [], favorites: [] };
    }

    const [matches, favorites] = await Promise.all([
      readAllFromStore<SavedBookEntry>(db, STORE_MATCHES),
      readAllFromStore<SavedBookEntry>(db, STORE_FAVORITES),
    ]);

    return {
      consentGranted: true,
      matches: matches.sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
      favorites: favorites.sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    };
  } catch {
    return { consentGranted: false, matches: [], favorites: [] };
  } finally {
    db?.close();
  }
}

/**
 * Enregistre l'accord explicite du lecteur puis sauvegarde les matchs et favoris actuels.
 */
export async function grantConsentAndSync(
  matches: SavedBookEntry[],
  favorites: SavedBookEntry[]
): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [STORE_META, STORE_MATCHES, STORE_FAVORITES],
        'readwrite'
      );
      tx.objectStore(STORE_META).put({ key: CONSENT_KEY, value: true });

      const matchesStore = tx.objectStore(STORE_MATCHES);
      matchesStore.clear();
      for (const entry of matches) {
        matchesStore.put(entry);
      }

      const favStore = tx.objectStore(STORE_FAVORITES);
      favStore.clear();
      for (const entry of favorites) {
        favStore.put(entry);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Persiste un match ou un favori uniquement si le lecteur a donné son accord.
 */
export async function syncLocalEntriesIfConsented(
  consentGranted: boolean,
  matches: SavedBookEntry[],
  favorites: SavedBookEntry[]
): Promise<void> {
  if (!consentGranted || !isIndexedDbAvailable()) return;
  await grantConsentAndSync(matches, favorites);
}

/**
 * Efface intégralement les données locales sur l'appareil et supprime la base IndexedDB.
 */
export async function clearAllLocalData(): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}
