import Papa from 'papaparse';
import type { Book, CatalogFacets } from '../../types/book';
import {
  parseAndValidateBookRows,
  type CsvRowIssue,
  type RawBookCsvRow,
} from './csvParser';
import rawCatalogCsv from '../../../data/2026-11-17_Catalogue-Livres.csv?raw';

export interface ParsedCatalog {
  books: Book[];
  issues: CsvRowIssue[];
  facets: CatalogFacets;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'fr-FR')
  );
}

/**
 * Extrait dynamiquement toutes les options de filtrage et de questionnaire depuis le CSV.
 */
export function extractCatalogFacets(books: Book[]): CatalogFacets {
  const prices = books
    .map((b) => b.prix_eur_num)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p));

  const longueurOrder = ['Peu de pages', 'Nombre moyen de pages', 'Beaucoup de pages'];
  const longueursRaw = uniqueSorted(books.map((b) => b.nb_pages_categorie));
  const longueurs = longueursRaw.sort((a, b) => {
    const ia = longueurOrder.indexOf(a);
    const ib = longueurOrder.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    return a.localeCompare(b, 'fr-FR');
  });

  return {
    genres: uniqueSorted(books.map((b) => b.genre_principal)),
    humeurs: uniqueSorted(books.flatMap((b) => b.humeurs)),
    themes: uniqueSorted(books.flatMap((b) => b.themes)),
    longueurs,
    formats: uniqueSorted(books.map((b) => b.format_physique)),
    poids: uniqueSorted(books.map((b) => b.poids_transport)),
    rythmes: uniqueSorted(books.map((b) => b.rythme)),
    series: uniqueSorted(books.map((b) => b.profil_serie)),
    fins: uniqueSorted(books.map((b) => b.fin_histoire)),
    tranchesPrix: uniqueSorted(books.map((b) => b.tranche_prix)),
    minPriceEur: prices.length > 0 ? Math.floor(Math.min(...prices)) : 0,
    maxPriceEur: prices.length > 0 ? Math.ceil(Math.max(...prices)) : 30,
  };
}

/**
 * Parse un contenu CSV quelconque avec PapaParse côté client.
 */
export function parseCatalogCsv(csvText: string): ParsedCatalog {
  const cleanedCsv = csvText.replace(/^\uFEFF/, '');
  const parsed = Papa.parse<RawBookCsvRow>(cleanedCsv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  const { validBooks, issues } = parseAndValidateBookRows(parsed.data);
  const facets = extractCatalogFacets(validBooks);

  return {
    books: validBooks,
    issues,
    facets,
  };
}

let cachedCatalog: ParsedCatalog | null = null;

/**
 * Charge et met en mémoire le catalogue issu de data/2026-11-17_Catalogue-Livres.csv.
 */
export function loadLocalCatalog(): ParsedCatalog {
  if (!cachedCatalog) {
    cachedCatalog = parseCatalogCsv(rawCatalogCsv);
  }
  return cachedCatalog;
}
