import { useEffect } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import type { Book, MatchResult, QuizAnswers } from '../../types/book';
import type { CachedBookRecord } from '../../lib/enrichment/metadataCache';
import { BookCover } from '../BookCover';
import { BookCard } from '../BookCard';

interface TopRecommendationsProps {
  recommendations: MatchResult[];
  answers: QuizAnswers;
  getMetadata: (isbn13: string) => CachedBookRecord | null;
  requestEnrichment: (isbns: string[]) => void;
  onSelectBook: (book: Book, match?: MatchResult) => void;
  onEditQuiz: () => void;
  onRestartQuiz: () => void;
  onOpenCatalog: () => void;
}

function summarizeActiveFilters(answers: QuizAnswers): string[] {
  const tags: string[] = [];
  if (answers.humeurs.length > 0) tags.push(`Humeur : ${answers.humeurs.join(', ')}`);
  if (answers.genres.length > 0) tags.push(`Genres : ${answers.genres.join(', ')}`);
  if (answers.themes.length > 0) tags.push(`Thèmes : ${answers.themes.join(', ')}`);
  if (answers.longueur) tags.push(answers.longueur);
  if (answers.formatPhysique) tags.push(answers.formatPhysique);
  if (answers.poidsTransport) tags.push(answers.poidsTransport);
  if (answers.rythme) tags.push(answers.rythme);
  if (answers.profilSerie) tags.push(answers.profilSerie);
  if (answers.finHistoire) tags.push(answers.finHistoire);
  if (answers.tranchePrix) tags.push(answers.tranchePrix);
  if (answers.maxBudgetEur !== null) tags.push(`Budget ≤ ${answers.maxBudgetEur} €`);
  return tags;
}

export function TopRecommendations({
  recommendations,
  answers,
  getMetadata,
  requestEnrichment,
  onSelectBook,
  onEditQuiz,
  onRestartQuiz,
  onOpenCatalog,
}: TopRecommendationsProps) {
  useEffect(() => {
    const isbns = recommendations.map((r) => r.book.isbn_13);
    requestEnrichment(isbns);
  }, [recommendations, requestEnrichment]);

  const activeTags = summarizeActiveFilters(answers);
  const topOne = recommendations[0];
  const others = recommendations.slice(1);

  return (
    <section className="mx-auto max-w-6xl space-y-8">
      {/* Bandeau résumé & actions */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border-editorial bg-paper p-5 shadow-xs sm:flex-row sm:items-center sm:p-7">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-terracotta-dark">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Votre sélection personnalisée
          </span>
          <h1 className="mt-2 font-serif text-2xl font-bold text-midnight sm:text-3xl">
            Top 5 de vos matchs littéraires
          </h1>

          {activeTags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-border-editorial bg-cream px-2.5 py-1 text-xs font-medium text-midnight"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-ink-muted">
              Tous critères ouverts (« Peu importe ») — sélection éditoriale de la librairie.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onEditQuiz}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-border-editorial bg-cream px-4 py-2 text-sm font-medium text-midnight transition-colors hover:bg-cream-dark"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>Modifier mes réponses</span>
          </button>

          <button
            type="button"
            onClick={onRestartQuiz}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-border-editorial bg-paper px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-midnight"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Recommencer</span>
          </button>
        </div>
      </div>

      {/* Coup de cœur #1 */}
      {topOne && (() => {
        const meta = getMetadata(topOne.book.isbn_13);
        return (
          <article className="overflow-hidden rounded-3xl border-2 border-terracotta/30 bg-paper shadow-md">
            <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-[220px_1fr]">
              <div className="mx-auto w-44 md:mx-0 md:w-full">
                <BookCover book={topOne.book} metadata={meta} size="lg" />
              </div>

              <div className="flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-midnight px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                    <Award className="h-3.5 w-3.5 text-terracotta-light" aria-hidden="true" />
                    N°1 • Meilleur Match
                  </span>
                  <span className="rounded-full bg-terracotta px-4 py-1.5 text-sm font-bold text-white shadow-xs">
                    {topOne.scorePercent} % compatible
                  </span>
                </div>

                <h2 className="mt-3 font-serif text-2xl font-bold text-midnight sm:text-3xl">
                  {topOne.book.title}
                </h2>
                <p className="mt-1 text-base font-medium text-ink-muted">
                  {topOne.book.author}
                  {meta?.publisher || meta?.publishYear
                    ? ` • ${[meta.publisher, meta.publishYear].filter(Boolean).join(', ')}`
                    : ''}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-muted">
                  <span className="rounded-md bg-cream-dark px-2.5 py-1 font-medium text-midnight">
                    {topOne.book.genre_principal}
                  </span>
                  {topOne.book.format_physique && (
                    <span className="rounded-md bg-cream px-2.5 py-1 border border-border-editorial">
                      {topOne.book.format_physique}
                    </span>
                  )}
                  {topOne.book.nb_pages_approx && (
                    <span className="rounded-md bg-cream px-2.5 py-1 border border-border-editorial">
                      ~{topOne.book.nb_pages_approx} pages
                    </span>
                  )}
                  {topOne.book.prix_indicatif_eur && (
                    <span className="rounded-md bg-cream px-2.5 py-1 font-semibold text-midnight border border-border-editorial">
                      {topOne.book.prix_indicatif_eur}
                    </span>
                  )}
                </div>

                {meta?.synopsis && (
                  <p className="mt-4 text-sm leading-relaxed text-ink-muted line-clamp-3">
                    {meta.synopsis}
                  </p>
                )}

                {topOne.reasons.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-border-editorial bg-cream/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-midnight/80">
                      Pourquoi ce livre vous correspond
                    </p>
                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {topOne.reasons.map((reason) => (
                        <li
                          key={reason}
                          className="flex items-start gap-2 text-sm text-midnight"
                        >
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-terracotta"
                            aria-hidden="true"
                          />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectBook(topOne.book, topOne)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-terracotta px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-terracotta-dark"
                  >
                    <span>Lire le résumé complet & la fiche</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })()}

      {/* Recommandations #2 à #5 */}
      {others.length > 0 && (
        <div>
          <h2 className="mb-4 font-serif text-xl font-bold text-midnight sm:text-2xl">
            Les 4 autres belles affinités
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {others.map((match, idx) => (
              <BookCard
                key={match.book.id}
                book={match.book}
                metadata={getMetadata(match.book.isbn_13)}
                match={match}
                rank={idx + 2}
                onSelect={(b) => onSelectBook(b, match)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lien vers le catalogue complet */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border-editorial bg-cream-dark/50 px-6 py-5 sm:flex-row">
        <div>
          <p className="font-serif text-lg font-semibold text-midnight">
            Envie d’explorer d’autres rayons ?
          </p>
          <p className="text-sm text-ink-muted">
            Parcourez l’intégralité de notre catalogue avec recherche et filtres instantanés.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCatalog}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-midnight px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-midnight-soft"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span>Explorer tout le catalogue</span>
        </button>
      </div>
    </section>
  );
}
