import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchEnrichedBookMetadata } from '../lib/enrichment/bookApiService';
import {
  getAllCachedMetadata,
  getCachedBookMetadata,
  type CachedBookRecord,
} from '../lib/enrichment/metadataCache';

const MAX_CONCURRENT_REQUESTS = 3;

export function useBookEnrichment() {
  const [metadataByIsbn, setMetadataByIsbn] = useState<Record<string, CachedBookRecord>>(() =>
    getAllCachedMetadata()
  );
  const [loadingIsbns, setLoadingIsbns] = useState<Set<string>>(() => new Set());

  const metadataRef = useRef(metadataByIsbn);
  metadataRef.current = metadataByIsbn;

  const queueRef = useRef<string[]>([]);
  const activeCountRef = useRef(0);
  const queuedSetRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pumpQueue = useCallback(() => {
    while (
      activeCountRef.current < MAX_CONCURRENT_REQUESTS &&
      queueRef.current.length > 0
    ) {
      const isbn = queueRef.current.shift();
      if (!isbn) continue;
      queuedSetRef.current.delete(isbn);

      if (getCachedBookMetadata(isbn)) {
        continue;
      }

      activeCountRef.current += 1;
      if (mountedRef.current) {
        setLoadingIsbns((prev) => {
          const next = new Set(prev);
          next.add(isbn);
          return next;
        });
      }

      fetchEnrichedBookMetadata(isbn)
        .then((record) => {
          if (!mountedRef.current) return;
          setMetadataByIsbn((prev) => ({
            ...prev,
            [isbn]: record,
          }));
        })
        .finally(() => {
          activeCountRef.current -= 1;
          if (mountedRef.current) {
            setLoadingIsbns((prev) => {
              const next = new Set(prev);
              next.delete(isbn);
              return next;
            });
          }
          pumpQueue();
        });
    }
  }, []);

  const requestEnrichment = useCallback(
    (isbns: string[]) => {
      let added = false;
      for (const isbn of isbns) {
        if (!isbn) continue;
        const cached = getCachedBookMetadata(isbn);
        if (cached) {
          if (!metadataRef.current[isbn]) {
            setMetadataByIsbn((prev) => ({ ...prev, [isbn]: cached }));
          }
          continue;
        }
        if (!queuedSetRef.current.has(isbn)) {
          queuedSetRef.current.add(isbn);
          queueRef.current.push(isbn);
          added = true;
        }
      }
      if (added) {
        pumpQueue();
      }
    },
    [pumpQueue]
  );

  const getMetadata = useCallback(
    (isbn13: string): CachedBookRecord | null => {
      return metadataByIsbn[isbn13] ?? getCachedBookMetadata(isbn13);
    },
    [metadataByIsbn]
  );

  const isLoading = useCallback(
    (isbn13: string): boolean => loadingIsbns.has(isbn13),
    [loadingIsbns]
  );

  return {
    metadataByIsbn,
    requestEnrichment,
    getMetadata,
    isLoading,
  };
}
