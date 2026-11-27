import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Book, CatalogFacets } from '../../types/book';
import type { CachedBookRecord } from '../../lib/enrichment/metadataCache';
import { BookCard } from '../BookCard';

interface CatalogExplorerProps {
  books: Book[];
  facets: CatalogFacets;
  getMetadata: (isbn13: string) => CachedBookRecord | null;
  requestEnrichment: (isbns: string[]) => void;
  onSelectBook: (book: Book) => void;
}

type SortOption = 'id-asc' | 'title-asc' | 'price-asc' | 'pages-asc';

export function CatalogExplorer({
  books,
  facets,
  getMetadata,
  requestEnrichment,
  onSelectBook,
}: CatalogExplorerProps) {
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedHumeur, setSelectedHumeur] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [selectedLongueur, setSelectedLongueur] = useState('');
  const [selectedPriceBand, setSelectedPriceBand] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('id-asc');

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr-FR');

    const matches = books.filter((book) => {
      if (selectedGenre && book.genre_principal !== selectedGenre) return false;
      if (selectedHumeur && !book.humeurs.includes(selectedHumeur)) return false;
      if (selectedFormat && book.format_physique !== selectedFormat) return false;
      if (selectedLongueur && book.nb_pages_categorie !== selectedLongueur) return false;
      if (selectedPriceBand && book.tranche_prix !== selectedPriceBand) return false;

      if (q) {
        const haystack = [
          book.title,
          book.author,
          book.isbn_13,
          book.genre_principal,
          ...book.sous_categories,
          ...book.themes,
          ...book.tags_synthese,
        ]
          .join(' ')
          .toLocaleLowerCase('fr-FR');
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return [...matches].sort((a, b) => {
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title, 'fr-FR');
      if (sortBy === 'price-asc') {
        return (a.prix_eur_num ?? 999) - (b.prix_eur_num ?? 999);
      }
      if (sortBy === 'pages-asc') {
        return (a.nb_pages_approx ?? 9999) - (b.nb_pages_approx ?? 9999);
      }
      return a.id - b.id;
    });
  }, [
    books,
    query,
    selectedGenre,
    selectedHumeur,
    selectedFormat,
    selectedLongueur,
    selectedPriceBand,
    sortBy,
  ]);

  // Enrichit progressivement les livres affichés (par lots pour rester fluide)
  useEffect(() => {
    const isbns = filteredBooks.slice(0, 12).map((b) => b.isbn_13);
    requestEnrichment(isbns);
  }, [filteredBooks, requestEnrichment]);

  const hasActiveFilters = Boolean(
    query ||
      selectedGenre ||
      selectedHumeur ||
      selectedFormat ||
      selectedLongueur ||
      selectedPriceBand
  );

  const resetFilters = () => {
    setQuery('');
    setSelectedGenre('');
    setSelectedHumeur('');
    setSelectedFormat('');
    setSelectedLongueur('');
    setSelectedPriceBand('');
    setSortBy('id-asc');
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-3xl border border-border-editorial bg-paper p-5 shadow-xs sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-terracotta">
              Rayons de la librairie
            </p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-midnight sm:text-3xl">
              Catalogue complet ({books.length} ouvrages)
            </h1>
          </div>

          <p className="text-sm font-medium text-ink-muted">
            <strong className="text-midnight">{filteredBooks.length}</strong>{' '}
            {filteredBooks.length > 1 ? 'livres affichés' : 'livre affiché'}
          </p>
        </div>

        {/* Barre de recherche instantanée */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par titre, auteur, thème, #tag ou ISBN-13…"
              aria-label="Rechercher dans le catalogue"
              className="min-h-[46px] w-full rounded-xl border border-border-editorial bg-cream/60 pl-10 pr-10 text-sm text-midnight placeholder:text-ink-muted/70 focus:border-terracotta focus:bg-paper focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Effacer la recherche"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-muted hover:bg-cream-dark hover:text-midnight"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal
              className="h-4 w-4 shrink-0 text-ink-muted"
              aria-hidden="true"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Trier le catalogue"
              className="min-h-[46px] rounded-xl border border-border-editorial bg-cream/60 px-3.5 text-sm font-medium text-midnight focus:border-terracotta focus:outline-none"
            >
              <option value="id-asc">Ordre du catalogue</option>
              <option value="title-asc">Titre (A → Z)</option>
              <option value="price-asc">Prix croissant</option>
              <option value="pages-asc">Pagination croissante</option>
            </select>
          </div>
        </div>

        {/* Filtres instantanés */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            aria-label="Filtrer par genre"
            className="min-h-[42px] rounded-xl border border-border-editorial bg-paper px-3 text-sm text-midnight focus:border-terracotta focus:outline-none"
          >
            <option value="">Tous les genres</option>
            {facets.genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            value={selectedHumeur}
            onChange={(e) => setSelectedHumeur(e.target.value)}
            aria-label="Filtrer par humeur"
            className="min-h-[42px] rounded-xl border border-border-editorial bg-paper px-3 text-sm text-midnight focus:border-terracotta focus:outline-none"
          >
            <option value="">Toutes les humeurs</option>
            {facets.humeurs.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>

          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            aria-label="Filtrer par format"
            className="min-h-[42px] rounded-xl border border-border-editorial bg-paper px-3 text-sm text-midnight focus:border-terracotta focus:outline-none"
          >
            <option value="">Tous les formats</option>
            {facets.formats.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={selectedLongueur}
            onChange={(e) => setSelectedLongueur(e.target.value)}
            aria-label="Filtrer par nombre de pages"
            className="min-h-[42px] rounded-xl border border-border-editorial bg-paper px-3 text-sm text-midnight focus:border-terracotta focus:outline-none"
          >
            <option value="">Toutes les longueurs</option>
            {facets.longueurs.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <select
            value={selectedPriceBand}
            onChange={(e) => setSelectedPriceBand(e.target.value)}
            aria-label="Filtrer par tranche de prix"
            className="min-h-[42px] rounded-xl border border-border-editorial bg-paper px-3 text-sm text-midnight focus:border-terracotta focus:outline-none"
          >
            <option value="">Tous les budgets</option>
            {facets.tranchesPrix.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Réinitialiser tous les filtres</span>
            </button>
          </div>
        )}
      </div>

      {/* Grille des livres */}
      {filteredBooks.length === 0 ? (
        <div className="rounded-3xl border border-border-editorial bg-paper p-10 text-center">
          <p className="font-serif text-xl font-semibold text-midnight">
            Aucun ouvrage ne correspond à ces critères
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Essayez d’élargir votre recherche ou de réinitialiser les filtres.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-terracotta px-5 py-2.5 text-sm font-semibold text-white hover:bg-terracotta-dark"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Afficher tout le catalogue</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              metadata={getMetadata(book.isbn_13)}
              onSelect={(b) => onSelectBook(b)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
