import { CheckCircle2, Sparkles } from 'lucide-react';
import type { Book, MatchResult } from '../types/book';
import type { CachedBookRecord } from '../lib/enrichment/metadataCache';
import { BookCover } from './BookCover';

interface BookCardProps {
  book: Book;
  metadata?: CachedBookRecord | null;
  match?: MatchResult;
  rank?: number;
  onSelect: (book: Book) => void;
}

export function BookCard({ book, metadata, match, rank, onSelect }: BookCardProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border-editorial bg-paper shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-midnight/25 hover:shadow-md">
      <div className="flex gap-4 p-4 sm:p-5">
        <div className="w-24 shrink-0 sm:w-28">
          <BookCover book={book} metadata={metadata} size="md" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="inline-flex items-center rounded-full bg-cream-dark px-2.5 py-0.5 text-xs font-medium text-midnight">
              {book.genre_principal}
            </span>

            {match && (
              <span className="inline-flex items-center gap-1 rounded-full bg-terracotta-light px-2.5 py-1 text-xs font-bold text-terracotta-dark">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {match.scorePercent} % match
              </span>
            )}
          </div>

          {rank !== undefined && (
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-terracotta">
              Recommandation #{rank}
            </p>
          )}

          <h3 className="mt-1 font-serif text-lg font-semibold text-midnight line-clamp-2 group-hover:text-terracotta-dark transition-colors">
            {book.title}
          </h3>
          <p className="mt-0.5 text-sm font-medium text-ink-muted">{book.author}</p>

          {(metadata?.publisher || metadata?.publishYear) && (
            <p className="mt-1 text-xs text-ink-muted/85">
              {[metadata.publisher, metadata.publishYear].filter(Boolean).join(' • ')}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-ink-muted">
            {book.format_physique && <span>{book.format_physique}</span>}
            {book.nb_pages_approx && <span>~{book.nb_pages_approx} p.</span>}
            {book.prix_indicatif_eur && (
              <span className="font-semibold text-midnight">{book.prix_indicatif_eur}</span>
            )}
          </div>
        </div>
      </div>

      {match && match.reasons.length > 0 && (
        <div className="border-t border-border-editorial/80 bg-cream/70 px-4 py-3 sm:px-5">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-midnight/75">
            Pourquoi ce match
          </p>
          <ul className="space-y-1">
            {match.reasons.slice(0, 3).map((reason) => (
              <li key={reason} className="flex items-start gap-1.5 text-xs text-ink-muted">
                <CheckCircle2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terracotta"
                  aria-hidden="true"
                />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!match && book.humeurs.length > 0 && (
        <div className="border-t border-border-editorial/80 bg-cream/50 px-4 py-2.5 sm:px-5">
          <div className="flex flex-wrap gap-1.5">
            {book.humeurs.slice(0, 3).map((humeur) => (
              <span
                key={humeur}
                className="rounded-md bg-paper px-2 py-0.5 text-xs text-ink-muted border border-border-editorial/70"
              >
                {humeur}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto border-t border-border-editorial/80 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={() => onSelect(book)}
          className="w-full min-h-[40px] rounded-xl border border-midnight/15 bg-cream/60 px-4 py-2 text-sm font-medium text-midnight transition-colors hover:bg-midnight hover:text-white"
        >
          Voir la fiche & le résumé
        </button>
      </div>
    </article>
  );
}
