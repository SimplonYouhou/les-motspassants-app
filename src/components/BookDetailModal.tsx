import { useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  Tag,
  X,
} from 'lucide-react';
import type { Book, MatchResult } from '../types/book';
import type { CachedBookRecord } from '../lib/enrichment/metadataCache';
import { buildReservationMailto } from '../config/appConfig';
import { BookCover } from './BookCover';

interface BookDetailModalProps {
  book: Book | null;
  metadata: CachedBookRecord | null;
  isLoadingMetadata: boolean;
  match?: MatchResult;
  onClose: () => void;
}

export function BookDetailModal({
  book,
  metadata,
  isLoadingMetadata,
  match,
  onClose,
}: BookDetailModalProps) {
  useEffect(() => {
    if (!book) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book, onClose]);

  if (!book) return null;

  const detailRows = [
    { label: 'Genre & sous-catégories', value: [book.genre_principal, ...book.sous_categories].join(' • ') },
    { label: 'Humeur', value: book.humeurs.join(', ') },
    { label: 'Thèmes', value: book.themes.join(', ') },
    { label: 'Style de lecture', value: book.styles_lecture.join(', ') },
    { label: 'Rythme', value: book.rythme },
    { label: 'Langage & chapitres', value: book.langage_chapitres.join(', ') },
    { label: 'Série / Indépendant', value: book.profil_serie },
    { label: 'Personnages', value: book.types_personnages.join(', ') },
    { label: "Type d'histoire", value: book.types_histoire.join(', ') },
    { label: 'Fin', value: book.fin_histoire },
    {
      label: 'Format & volume',
      value: [
        book.format_physique,
        book.nb_pages_approx ? `~${book.nb_pages_approx} pages` : book.nb_pages_categorie,
        book.poids_transport,
      ]
        .filter(Boolean)
        .join(' • '),
    },
    {
      label: 'Prix indicatif',
      value: [book.prix_indicatif_eur, book.tranche_prix].filter(Boolean).join(' — '),
    },
  ].filter((row) => row.value.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-detail-title"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border-editorial bg-cream shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-editorial bg-cream/95 px-5 py-3.5 backdrop-blur-sm sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-terracotta">
            Fiche détaillée • ISBN {book.isbn_13}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fiche"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-editorial bg-paper text-midnight transition-colors hover:bg-cream-dark"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-48">
              <BookCover book={book} metadata={metadata} size="lg" />
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-midnight px-3 py-1 text-xs font-medium text-white">
                  {book.genre_principal}
                </span>
                {match && (
                  <span className="rounded-full bg-terracotta px-3 py-1 text-xs font-semibold text-white">
                    Score Match : {match.scorePercent} %
                  </span>
                )}
              </div>

              <h2
                id="book-detail-title"
                className="mt-3 font-serif text-2xl font-bold text-midnight sm:text-3xl"
              >
                {book.title}
              </h2>
              <p className="mt-1 text-base font-medium text-ink-muted">{book.author}</p>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-muted">
                {metadata?.publisher && (
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-terracotta" />
                    Éditeur : <strong className="text-midnight">{metadata.publisher}</strong>
                  </span>
                )}
                {metadata?.publishYear && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-terracotta" />
                    Parution : <strong className="text-midnight">{metadata.publishYear}</strong>
                  </span>
                )}
                {book.prix_indicatif_eur && (
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-terracotta" />
                    Prix indicatif :{' '}
                    <strong className="text-midnight">{book.prix_indicatif_eur}</strong>
                  </span>
                )}
              </div>

              {match && match.reasons.length > 0 && (
                <div className="mt-4 rounded-xl border border-terracotta/20 bg-terracotta-light/60 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-terracotta-dark">
                    Points de compatibilité
                  </p>
                  <ul className="mt-2 space-y-1">
                    {match.reasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-2 text-sm text-midnight">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-5 rounded-xl border border-border-editorial bg-paper p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-serif text-base font-semibold text-midnight">
                    Résumé
                  </h3>
                  {metadata && metadata.metadataSource !== 'none' && (
                    <span className="text-[11px] font-medium text-ink-muted">
                      Source :{' '}
                      {metadata.metadataSource === 'openlibrary'
                        ? 'Open Library'
                        : 'Google Books'}
                    </span>
                  )}
                </div>

                {isLoadingMetadata && !metadata?.synopsis ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-terracotta" />
                    <span>Récupération du résumé via Open Library / Google Books…</span>
                  </div>
                ) : metadata?.synopsis ? (
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {metadata.synopsis}
                  </p>
                ) : (
                  <p className="mt-2 text-sm italic text-ink-muted">
                    Aucun synopsis disponible dans les bases Open Library ou Google Books pour cet ISBN.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {detailRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-border-editorial bg-paper px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  {row.label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-midnight">{row.value}</p>
              </div>
            ))}
          </div>

          {book.tags_synthese.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {book.tags_synthese.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border-editorial bg-paper px-3 py-1 text-xs font-medium text-ink-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-editorial pt-5">
            <p className="text-xs text-ink-muted">
              Renseignez-vous en librairie pour confirmer la disponibilité en rayon.
            </p>
            <a
              href={buildReservationMailto(book)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-terracotta px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-terracotta-dark"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              <span>Demander la mise de côté par e-mail</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
