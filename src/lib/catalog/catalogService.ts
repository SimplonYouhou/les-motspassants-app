import { createClient } from '@supabase/supabase-js';
import type { Book } from '../../types/book';
import { parseAndValidateBookRows, type RawBookCsvRow } from './csvParser';
import localCatalogCsv from '../../../data/2026-11-17_Catalogue-Livres.csv?raw';

export interface CatalogResult {
  books: Book[];
  source: 'supabase' | 'local-csv';
  errorMessage?: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parse le CSV réel du dossier data/ côté navigateur uniquement si Supabase n'est pas configuré.
 * Aucun livre ni aucune donnée n'est inventée.
 */
export function loadLocalCsvFallback(): Book[] {
  const lines = localCatalogCsv
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rawRows: RawBookCsvRow[] = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header.trim()] = (values[idx] ?? '').trim();
    });
    return record as RawBookCsvRow;
  });

  return parseAndValidateBookRows(rawRows).validBooks;
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && anonKey);
}

/**
 * Charge le catalogue des livres depuis Supabase (lecture publique SELECT uniquement).
 * Désactive explicitement persistSession pour éviter toute écriture dans localStorage.
 */
export async function fetchCatalog(): Promise<CatalogResult> {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return {
      books: loadLocalCsvFallback(),
      source: 'local-csv',
    };
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await supabase
      .from('books')
      .select(
        'id, title, author, isbn_13, genre_principal, sous_categories, humeurs, themes, styles_lecture, rythme, langage_chapitres, profil_serie, types_personnages, types_histoire, fin_histoire, format_physique, nb_pages_categorie, nb_pages_approx, poids_transport, tranche_prix, prix_indicatif_eur, tags_synthese, cover_url, summary, is_enriched'
      )
      .order('id', { ascending: true });

    if (error) {
      return {
        books: loadLocalCsvFallback(),
        source: 'local-csv',
        errorMessage: `Catalogue Supabase inaccessible (${error.message}). Affichage du catalogue CSV local.`,
      };
    }

    return {
      books: (data ?? []) as Book[],
      source: 'supabase',
    };
  } catch (err) {
    return {
      books: loadLocalCsvFallback(),
      source: 'local-csv',
      errorMessage:
        err instanceof Error
          ? `Erreur réseau Supabase (${err.message}). Affichage du catalogue CSV local.`
          : 'Erreur réseau Supabase. Affichage du catalogue CSV local.',
    };
  }
}
