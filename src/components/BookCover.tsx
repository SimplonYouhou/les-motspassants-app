import { useEffect, useRef, useState } from 'react';
import type { Book } from '../types/book';
import {
  fetchEnrichedBookMetadata,
  getLocalCoverUrl,
  getOpenLibraryCoverUrl,
  sanitizeIsbn,
} from '../lib/enrichment/bookApiService';
import {
  getCachedBookMetadata,
  updateCachedCoverOutcome,
  type CachedBookRecord,
} from '../lib/enrichment/metadataCache';

interface BookCoverProps {
  book: Book;
  metadata?: CachedBookRecord | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

type CoverStage = 'local' | 'openlibrary' | 'googlebooks' | 'typographic';

const COVER_PALETTES = [
  { bg: 'bg-[#1E293B]', accent: 'text-[#F3D5C8]', rule: 'border-[#E6B8A2]/40' },
  { bg: 'bg-[#1F4E5F]', accent: 'text-[#E7ECEF]', rule: 'border-white/30' },
  { bg: 'bg-[#8C382B]', accent: 'text-[#FBF2EE]', rule: 'border-white/30' },
  { bg: 'bg-[#2C4A3E]', accent: 'text-[#E8F1EC]', rule: 'border-white/30' },
  { bg: 'bg-[#42324A]', accent: 'text-[#F3ECF6]', rule: 'border-white/30' },
];

function pickPalette(genre: string) {
  let hash = 0;
  for (let i = 0; i < genre.length; i += 1) {
    hash = (hash * 31 + genre.charCodeAt(i)) >>> 0;
  }
  return COVER_PALETTES[hash % COVER_PALETTES.length];
}

function resolveCachedRecord(
  cleanIsbn: string,
  metadata?: CachedBookRecord | null
): CachedBookRecord | null {
  const stored = getCachedBookMetadata(cleanIsbn);
  if (stored && stored.coverSource !== 'none') {
    return stored;
  }
  return metadata ?? stored;
}

function getInitialStage(
  cleanIsbn: string,
  metadata?: CachedBookRecord | null
): { stage: CoverStage; googleUrl: string | null } {
  const cached = resolveCachedRecord(cleanIsbn, metadata);
  const googleUrl = cached?.googleCoverUrl ?? metadata?.googleCoverUrl ?? null;

  if (!cleanIsbn) {
    return { stage: 'typographic', googleUrl: null };
  }

  // Si le résultat a déjà été résolu et mis en cache dans localStorage,
  // on réutilise directement cette issue sans refaire de requêtes 404 en boucle.
  if (cached?.coverSource === 'typographic') {
    return { stage: 'typographic', googleUrl };
  }
  if (cached?.coverSource === 'local') {
    return { stage: 'local', googleUrl };
  }
  if (cached?.coverSource === 'openlibrary') {
    return { stage: 'openlibrary', googleUrl };
  }
  if (cached?.coverSource === 'googlebooks' && googleUrl) {
    return { stage: 'googlebooks', googleUrl };
  }

  return { stage: 'local', googleUrl };
}

/**
 * Couverture avec cascade stricte sur ISBN nettoyé (chiffres uniquement) :
 * 1. Image locale optionnelle (/covers/{isbn}.jpg)
 * 2. Open Library (https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false)
 * 3. Google Books (https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn})
 * 4. Couverture typographique éditoriale (<p class="font-serif ...">) + mise en cache localStorage
 */
export function BookCover({
  book,
  metadata,
  className = '',
  size = 'md',
}: BookCoverProps) {
  const cleanIsbn = sanitizeIsbn(book.isbn_13);
  const localUrl = getLocalCoverUrl(cleanIsbn);
  const openLibraryUrl = getOpenLibraryCoverUrl(cleanIsbn);

  const initial = getInitialStage(cleanIsbn, metadata);
  const [stage, setStage] = useState<CoverStage>(initial.stage);
  const [googleUrl, setGoogleUrl] = useState<string | null>(initial.googleUrl);
  const awaitingGoogleRef = useRef(false);

  // Réinitialise uniquement lors d'un changement de livre (ISBN)
  useEffect(() => {
    const next = getInitialStage(cleanIsbn, metadata);
    setStage(next.stage);
    setGoogleUrl(next.googleUrl);
    awaitingGoogleRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanIsbn]);

  // Met à jour l'URL Google Books si elle arrive de l'enrichissement asynchrone
  // sans jamais réinitialiser vers 'local' quand coverSource vaut 'none'
  useEffect(() => {
    if (metadata?.googleCoverUrl) {
      setGoogleUrl(metadata.googleCoverUrl);
    }
    if (metadata?.coverSource && metadata.coverSource !== 'none') {
      if (metadata.coverSource === 'googlebooks' && metadata.googleCoverUrl) {
        setStage('googlebooks');
      } else if (metadata.coverSource !== 'googlebooks') {
        setStage(metadata.coverSource);
      }
    }
  }, [metadata?.coverSource, metadata?.googleCoverUrl]);

  const activeUrl =
    stage === 'local'
      ? localUrl
      : stage === 'openlibrary'
      ? openLibraryUrl
      : stage === 'googlebooks'
      ? googleUrl
      : null;

  const handleImageLoadSuccess = (naturalWidth: number, naturalHeight: number) => {
    // Certaines API renvoient un pixel transparent 1x1 au lieu d'un HTTP 404
    if (naturalWidth <= 2 || naturalHeight <= 2) {
      handleImageError();
      return;
    }

    if (stage === 'local') {
      updateCachedCoverOutcome(cleanIsbn, localUrl, 'local');
    } else if (stage === 'openlibrary') {
      updateCachedCoverOutcome(cleanIsbn, openLibraryUrl, 'openlibrary');
    } else if (stage === 'googlebooks' && googleUrl) {
      updateCachedCoverOutcome(cleanIsbn, googleUrl, 'googlebooks');
    }
  };

  const handleImageError = () => {
    if (stage === 'local') {
      setStage('openlibrary');
      return;
    }

    if (stage === 'openlibrary') {
      const knownGoogleUrl =
        googleUrl ??
        metadata?.googleCoverUrl ??
        getCachedBookMetadata(cleanIsbn)?.googleCoverUrl ??
        null;

      if (knownGoogleUrl) {
        setGoogleUrl(knownGoogleUrl);
        setStage('googlebooks');
        return;
      }

      // Si l'API Google Books n'a pas encore été interrogée pour cet ISBN, on la consulte
      if (!awaitingGoogleRef.current && cleanIsbn) {
        awaitingGoogleRef.current = true;
        setStage('typographic');

        fetchEnrichedBookMetadata(cleanIsbn)
          .then((record) => {
            awaitingGoogleRef.current = false;
            if (record.googleCoverUrl) {
              setGoogleUrl(record.googleCoverUrl);
              setStage('googlebooks');
            } else {
              updateCachedCoverOutcome(cleanIsbn, null, 'typographic');
            }
          })
          .catch(() => {
            awaitingGoogleRef.current = false;
            updateCachedCoverOutcome(cleanIsbn, null, 'typographic');
          });
      } else {
        setStage('typographic');
        updateCachedCoverOutcome(cleanIsbn, null, 'typographic');
      }
      return;
    }

    if (stage === 'googlebooks') {
      setStage('typographic');
      updateCachedCoverOutcome(cleanIsbn, null, 'typographic');
    }
  };

  const palette = pickPalette(book.genre_principal);

  const titleClasses =
    size === 'lg'
      ? 'text-lg sm:text-xl leading-snug'
      : size === 'sm'
      ? 'text-xs leading-snug'
      : 'text-sm sm:text-base leading-snug';

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-border-editorial bg-cream-dark shadow-sm ${className}`}
    >
      {activeUrl ? (
        <img
          src={activeUrl}
          alt={`Couverture de ${book.title} par ${book.author}`}
          loading="lazy"
          onError={handleImageError}
          onLoad={(e) => {
            const img = e.currentTarget;
            handleImageLoadSuccess(img.naturalWidth, img.naturalHeight);
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col justify-between p-3.5 sm:p-4 ${palette.bg} text-white`}
          aria-label={`Couverture typographique de ${book.title} par ${book.author}`}
        >
          <div
            className={`flex h-full flex-col justify-between border ${palette.rule} p-2.5 sm:p-3`}
          >
            <div>
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.14em] opacity-85 ${palette.accent}`}
              >
                {book.genre_principal}
              </p>
            </div>

            <div className="my-auto py-2">
              <p className={`font-serif font-semibold text-white line-clamp-4 ${titleClasses}`}>
                {book.title}
              </p>
              <div className="mt-2 h-px w-8 bg-white/40" />
            </div>

            <div>
              <p className="truncate text-xs font-medium text-white/90">{book.author}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
