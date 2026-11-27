import { useMemo, useState } from 'react';
import { loadLocalCatalog } from './lib/catalog/catalogLoader';
import {
  createEmptyQuizAnswers,
  getTopRecommendations,
} from './lib/matching/matchingEngine';
import { useBookEnrichment } from './hooks/useBookEnrichment';
import type { AppView, Book, MatchResult, QuizAnswers } from './types/book';
import { Header } from './components/Header';
import { MatchWizard } from './components/questionnaire/MatchWizard';
import { TopRecommendations } from './components/results/TopRecommendations';
import { CatalogExplorer } from './components/catalog/CatalogExplorer';
import { BookDetailModal } from './components/BookDetailModal';

export function App() {
  const { books, facets, issues } = useMemo(() => loadLocalCatalog(), []);
  const { requestEnrichment, getMetadata, isLoading } = useBookEnrichment();

  const [activeView, setActiveView] = useState<AppView>('matchmaking');
  const [answers, setAnswers] = useState<QuizAnswers>(() => createEmptyQuizAnswers());
  const [quizCompleted, setQuizCompleted] = useState(false);

  const [selectedDetail, setSelectedDetail] = useState<{
    book: Book;
    match?: MatchResult;
  } | null>(null);

  const topRecommendations = useMemo(
    () => getTopRecommendations(books, answers, 5),
    [books, answers]
  );

  const handleOpenBookDetail = (book: Book, match?: MatchResult) => {
    requestEnrichment([book.isbn_13]);
    setSelectedDetail({ book, match });
  };

  const handleRestartQuiz = () => {
    setAnswers(createEmptyQuizAnswers());
    setQuizCompleted(false);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        totalBooks={books.length}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
        {issues.length > 0 && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-terracotta/30 bg-terracotta-light px-4 py-3 text-xs text-terracotta-dark"
          >
            {issues.length} ligne(s) du CSV ignorée(s) lors de la validation.
          </div>
        )}

        {activeView === 'matchmaking' ? (
          quizCompleted ? (
            <TopRecommendations
              recommendations={topRecommendations}
              answers={answers}
              getMetadata={getMetadata}
              requestEnrichment={requestEnrichment}
              onSelectBook={handleOpenBookDetail}
              onEditQuiz={() => setQuizCompleted(false)}
              onRestartQuiz={handleRestartQuiz}
              onOpenCatalog={() => setActiveView('catalogue')}
            />
          ) : (
            <MatchWizard
              facets={facets}
              answers={answers}
              onChangeAnswers={setAnswers}
              onComplete={() => setQuizCompleted(true)}
              onReset={handleRestartQuiz}
            />
          )
        ) : (
          <CatalogExplorer
            books={books}
            facets={facets}
            getMetadata={getMetadata}
            requestEnrichment={requestEnrichment}
            onSelectBook={(book) => handleOpenBookDetail(book)}
          />
        )}
      </main>

      <footer className="border-t border-border-editorial bg-paper/70 py-5 text-center text-xs text-ink-muted">
        <div className="mx-auto max-w-6xl px-4">
          Les MotsPassants — Matchmaking Librairie • Couvertures & résumés enrichis
          dynamiquement via Open Library & Google Books (cache local).
        </div>
      </footer>

      <BookDetailModal
        book={selectedDetail?.book ?? null}
        metadata={selectedDetail ? getMetadata(selectedDetail.book.isbn_13) : null}
        isLoadingMetadata={
          selectedDetail ? isLoading(selectedDetail.book.isbn_13) : false
        }
        match={selectedDetail?.match}
        onClose={() => setSelectedDetail(null)}
      />
    </div>
  );
}

export default App;
