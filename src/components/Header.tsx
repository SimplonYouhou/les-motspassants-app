import { BookOpen, Sparkles } from 'lucide-react';
import type { AppView } from '../types/book';

interface HeaderProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  totalBooks: number;
}

export function Header({ activeView, onSelectView, totalBooks }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border-editorial bg-cream/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <button
          type="button"
          onClick={() => onSelectView('matchmaking')}
          className="group flex items-center gap-3 text-left focus-visible:rounded-lg"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo-lmp-bleu-petrole.svg`}
            alt="Logo Les MotsPassants"
            className="h-11 w-auto shrink-0 transition-transform duration-200 group-hover:scale-[1.03]"
          />
          <div>
            <p className="font-serif text-lg font-semibold tracking-tight text-midnight sm:text-xl">
              Les MotsPassants
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-terracotta">
              Matchmaking Librairie
            </p>
          </div>
        </button>

        <nav
          aria-label="Navigation principale"
          className="inline-flex rounded-xl border border-border-editorial bg-paper p-1 shadow-xs"
        >
          <button
            type="button"
            onClick={() => onSelectView('matchmaking')}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeView === 'matchmaking'
                ? 'bg-midnight text-white shadow-xs'
                : 'text-ink-muted hover:bg-cream-dark/60 hover:text-midnight'
            }`}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Matchmaking</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('catalogue')}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeView === 'catalogue'
                ? 'bg-midnight text-white shadow-xs'
                : 'text-ink-muted hover:bg-cream-dark/60 hover:text-midnight'
            }`}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Catalogue complet</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeView === 'catalogue'
                  ? 'bg-white/15 text-white'
                  : 'bg-cream-dark text-midnight'
              }`}
            >
              {totalBooks}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
