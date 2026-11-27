import type { Book } from '../../types/book';

export interface RawBookCsvRow {
  ID?: string;
  Titre?: string;
  Auteur?: string;
  ISBN_13?: string;
  Genre_Principal?: string;
  Sous_Categorie?: string;
  Humeur_Mood?: string;
  Themes?: string;
  Style_Lecture?: string;
  Rythme?: string;
  Langage_Chapitres?: string;
  Profil_Serie?: string;
  Types_Personnages?: string;
  Type_Histoire?: string;
  Fin_Histoire?: string;
  Format_Physique?: string;
  Nb_Pages_Categorie?: string;
  Nb_Pages_Approx?: string;
  Poids_Transport?: string;
  Tranche_Prix?: string;
  Prix_Indicatif_EUR?: string;
  Tags_Synthese?: string;
}

export interface CsvRowIssue {
  lineNumber: number;
  idRaw: string;
  titleRaw: string;
  isbnRaw: string;
  reason: string;
}

export interface CsvValidationResult {
  validBooks: Book[];
  issues: CsvRowIssue[];
}

/**
 * Normalise un ISBN-13 en texte pur sans tirets ni espaces.
 */
export function normalizeIsbn(raw: string | undefined): string {
  if (!raw) return '';
  return raw.replace(/[\s-]+/g, '').trim();
}

/**
 * Découpe une colonne multi-valeurs (séparateur `/` ou `;`).
 */
export function splitMultiValue(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\/;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Découpe les tags de synthèse (#Tag1 #Tag2).
 */
export function splitTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

/**
 * Convertit le nombre de pages approximatif (ex. "1 400") en entier ou null.
 */
export function parsePagesApprox(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s\u00A0\u202F]+/g, '').trim();
  if (!cleaned || !/^\d+$/.test(cleaned)) return null;
  const value = Number.parseInt(cleaned, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Extrait le prix numérique en euros (ex. "9,40 €" -> 9.4).
 */
export function parsePriceEur(raw: string | undefined): number | null {
  if (!raw) return null;
  const match = raw.replace(/\s+/g, '').replace(',', '.').match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

/**
 * Valide un ensemble de lignes CSV brutes, détecte les doublons et signale les anomalies.
 */
export function parseAndValidateBookRows(rows: RawBookCsvRow[]): CsvValidationResult {
  const validBooks: Book[] = [];
  const issues: CsvRowIssue[] = [];
  const seenIds = new Set<number>();
  const seenIsbns = new Set<string>();

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    const idRaw = (row.ID ?? '').trim();
    const titleRaw = (row.Titre ?? '').trim();
    const authorRaw = (row.Auteur ?? '').trim();
    const isbnRaw = row.ISBN_13 ?? '';
    const isbn = normalizeIsbn(isbnRaw);
    const genrePrincipal = (row.Genre_Principal ?? '').trim();

    if (!/^\d+$/.test(idRaw)) {
      issues.push({
        lineNumber,
        idRaw,
        titleRaw,
        isbnRaw,
        reason: 'ID manquant ou invalide (entier positif attendu).',
      });
      return;
    }

    const id = Number.parseInt(idRaw, 10);
    if (seenIds.has(id)) {
      issues.push({
        lineNumber,
        idRaw,
        titleRaw,
        isbnRaw,
        reason: `ID en doublon : ${id}.`,
      });
      return;
    }

    if (!titleRaw || !authorRaw || !genrePrincipal) {
      issues.push({
        lineNumber,
        idRaw,
        titleRaw,
        isbnRaw,
        reason: 'Champ obligatoire manquant (Titre, Auteur ou Genre_Principal).',
      });
      return;
    }

    if (!/^\d{13}$/.test(isbn)) {
      issues.push({
        lineNumber,
        idRaw,
        titleRaw,
        isbnRaw,
        reason: `ISBN-13 invalide après normalisation : "${isbn}".`,
      });
      return;
    }

    if (seenIsbns.has(isbn)) {
      issues.push({
        lineNumber,
        idRaw,
        titleRaw,
        isbnRaw,
        reason: `ISBN-13 en doublon : ${isbn}.`,
      });
      return;
    }

    seenIds.add(id);
    seenIsbns.add(isbn);

    const prixIndicatif = (row.Prix_Indicatif_EUR ?? '').trim();

    validBooks.push({
      id,
      title: titleRaw,
      author: authorRaw,
      isbn_13: isbn,
      genre_principal: genrePrincipal,
      sous_categories: splitMultiValue(row.Sous_Categorie),
      humeurs: splitMultiValue(row.Humeur_Mood),
      themes: splitMultiValue(row.Themes),
      styles_lecture: splitMultiValue(row.Style_Lecture),
      rythme: (row.Rythme ?? '').trim(),
      langage_chapitres: splitMultiValue(row.Langage_Chapitres),
      profil_serie: (row.Profil_Serie ?? '').trim(),
      types_personnages: splitMultiValue(row.Types_Personnages),
      types_histoire: splitMultiValue(row.Type_Histoire),
      fin_histoire: (row.Fin_Histoire ?? '').trim(),
      format_physique: (row.Format_Physique ?? '').trim(),
      nb_pages_categorie: (row.Nb_Pages_Categorie ?? '').trim(),
      nb_pages_approx: parsePagesApprox(row.Nb_Pages_Approx),
      poids_transport: (row.Poids_Transport ?? '').trim(),
      tranche_prix: (row.Tranche_Prix ?? '').trim(),
      prix_indicatif_eur: prixIndicatif,
      prix_eur_num: parsePriceEur(prixIndicatif),
      tags_synthese: splitTags(row.Tags_Synthese),
      cover_url: null,
      summary: null,
      is_enriched: false,
    });
  });

  return { validBooks, issues };
}
