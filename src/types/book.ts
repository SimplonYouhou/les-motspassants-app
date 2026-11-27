/**
 * Représentation normalisée d'un livre du catalogue CSV.
 */
export interface Book {
  id: number;
  title: string;
  author: string;
  isbn_13: string;
  genre_principal: string;
  sous_categories: string[];
  humeurs: string[];
  themes: string[];
  styles_lecture: string[];
  rythme: string;
  langage_chapitres: string[];
  profil_serie: string;
  types_personnages: string[];
  types_histoire: string[];
  fin_histoire: string;
  format_physique: string;
  nb_pages_categorie: string;
  nb_pages_approx: number | null;
  poids_transport: string;
  tranche_prix: string;
  prix_indicatif_eur: string;
  prix_eur_num?: number | null;
  tags_synthese: string[];
  cover_url: string | null;
  summary: string | null;
  is_enriched: boolean;
}

/**
 * Métadonnées dynamiques récupérées via Open Library / Google Books et mises en cache.
 */
export interface EnrichedBookMetadata {
  isbn_13: string;
  coverUrl: string | null;
  coverSource: 'local' | 'openlibrary' | 'googlebooks' | 'typographic' | 'none';
  synopsis: string | null;
  publisher: string | null;
  publishYear: string | null;
  metadataSource: 'openlibrary' | 'googlebooks' | 'none';
  fetchedAt: number;
}

/**
 * Réponses au questionnaire de matchmaking en 5 étapes.
 * Les champs vides (`[]` ou `null`) signifient « Peu importe ».
 */
export interface QuizAnswers {
  // Étape 1 : Humeur recherchée
  humeurs: string[];
  // Étape 2 : Genres & Thèmes favoris
  genres: string[];
  themes: string[];
  // Étape 3 : Format & Temps de lecture
  longueur: string | null;
  formatPhysique: string | null;
  poidsTransport: string | null;
  // Étape 4 : Rythme, Série & Fin préférée
  rythme: string | null;
  profilSerie: string | null;
  finHistoire: string | null;
  // Étape 5 : Budget maximum
  tranchePrix: string | null;
  maxBudgetEur: number | null;
}

export interface CriterionBreakdown {
  key: 'humeur' | 'genres_themes' | 'format_lecture' | 'rythme_serie_fin' | 'budget';
  label: string;
  score: number; // 0 à 1
  weight: number;
  active: boolean;
}

export interface MatchResult {
  book: Book;
  scorePercent: number; // 0 à 100
  reasons: string[];
  breakdown: CriterionBreakdown[];
  isWithinBudget: boolean;
}

export interface CatalogFacets {
  genres: string[];
  humeurs: string[];
  themes: string[];
  longueurs: string[];
  formats: string[];
  poids: string[];
  rythmes: string[];
  series: string[];
  fins: string[];
  tranchesPrix: string[];
  minPriceEur: number;
  maxPriceEur: number;
}

export type AppView = 'matchmaking' | 'catalogue';

// Conservation de compatibilité avec les modules existants si besoin
export interface SavedBookEntry {
  bookId: number;
  scorePercent?: number;
  reasons?: string[];
  savedAt: string;
}
