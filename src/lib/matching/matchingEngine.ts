import type {
  Book,
  CriterionBreakdown,
  MatchResult,
  QuizAnswers,
} from '../../types/book';

export const QUIZ_WEIGHTS = {
  humeur: 0.25,
  genres_themes: 0.3,
  format_lecture: 0.15,
  rythme_serie_fin: 0.2,
  budget: 0.1,
} as const;

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('fr-FR');
}

function matchedItems(selected: string[], candidate: string[]): string[] {
  if (selected.length === 0 || candidate.length === 0) return [];
  const candidateSet = new Set(candidate.map(normalizeText));
  return selected.filter((item) => candidateSet.has(normalizeText(item)));
}

function computeOverlapScore(selected: string[], candidate: string[]): number {
  if (selected.length === 0 || candidate.length === 0) return 0;
  const hits = matchedItems(selected, candidate).length;
  // On valorise fortement dès qu'au moins une préférence du lecteur est satisfaite,
  // tout en récompensant la couverture multiple.
  return Math.min(1, hits / Math.min(selected.length, candidate.length));
}

function computeBudgetMatch(
  answers: QuizAnswers,
  book: Book
): { active: boolean; score: number; withinBudget: boolean; reason: string | null } {
  const hasTranche = answers.tranchePrix !== null;
  const hasMaxEur = answers.maxBudgetEur !== null;

  if (!hasTranche && !hasMaxEur) {
    return { active: false, score: 1, withinBudget: true, reason: null };
  }

  let withinTranche = true;
  if (hasTranche && answers.tranchePrix) {
    withinTranche =
      normalizeText(book.tranche_prix) === normalizeText(answers.tranchePrix);
  }

  let withinMaxEur = true;
  if (hasMaxEur && answers.maxBudgetEur !== null && book.prix_eur_num != null) {
    withinMaxEur = book.prix_eur_num <= answers.maxBudgetEur;
  }

  // Si les deux sont renseignés, les deux comptent ; sinon celui qui est renseigné
  const checks: boolean[] = [];
  if (hasTranche) checks.push(withinTranche);
  if (hasMaxEur && book.prix_eur_num != null) checks.push(withinMaxEur);

  const passedCount = checks.filter(Boolean).length;
  const score = checks.length > 0 ? passedCount / checks.length : 0.5;
  const withinBudget = checks.every(Boolean);

  let reason: string | null = null;
  if (withinBudget && book.prix_indicatif_eur) {
    reason = `Dans votre budget (${book.prix_indicatif_eur})`;
  } else if (withinBudget && book.tranche_prix) {
    reason = book.tranche_prix;
  }

  return { active: true, score, withinBudget, reason };
}

/**
 * Calcule le Score Match % (0 à 100) d'un livre par rapport aux 5 étapes du questionnaire.
 * Chaque critère laissé sur « Peu importe » est exclu du dénominateur de pondération.
 */
export function scoreBookForQuiz(book: Book, answers: QuizAnswers): MatchResult {
  const reasons: string[] = [];

  // 1. Humeur recherchée
  const humeurActive = answers.humeurs.length > 0;
  const humeurMatched = matchedItems(answers.humeurs, book.humeurs);
  const humeurScore = humeurActive
    ? computeOverlapScore(answers.humeurs, book.humeurs)
    : 0;
  if (humeurMatched.length > 0) {
    reasons.push(`Humeur : ${humeurMatched.join(', ')}`);
  }

  // 2. Genres & Thèmes favoris
  const hasGenres = answers.genres.length > 0;
  const hasThemes = answers.themes.length > 0;
  const genresThemesActive = hasGenres || hasThemes;

  let genrePartScore = 0;
  const genreMatchedLabels: string[] = [];
  if (hasGenres) {
    const selectedNorm = answers.genres.map(normalizeText);
    const mainNorm = normalizeText(book.genre_principal);
    const subNorms = new Set(book.sous_categories.map(normalizeText));

    for (let i = 0; i < answers.genres.length; i += 1) {
      if (selectedNorm[i] === mainNorm) {
        genrePartScore = 1;
        genreMatchedLabels.push(book.genre_principal);
      } else if (subNorms.has(selectedNorm[i])) {
        genrePartScore = Math.max(genrePartScore, 0.8);
        genreMatchedLabels.push(answers.genres[i]);
      }
    }
  }

  const themeMatched = matchedItems(answers.themes, book.themes);
  const themePartScore = hasThemes
    ? computeOverlapScore(answers.themes, book.themes)
    : 0;

  let genresThemesScore = 0;
  if (hasGenres && hasThemes) {
    genresThemesScore = genrePartScore * 0.55 + themePartScore * 0.45;
  } else if (hasGenres) {
    genresThemesScore = genrePartScore;
  } else if (hasThemes) {
    genresThemesScore = themePartScore;
  }

  if (genreMatchedLabels.length > 0) {
    reasons.push(`Genre : ${Array.from(new Set(genreMatchedLabels)).join(', ')}`);
  }
  if (themeMatched.length > 0) {
    reasons.push(`Thèmes : ${themeMatched.join(', ')}`);
  }

  // 3. Format & Temps de lecture
  const formatParts: number[] = [];
  const formatReasons: string[] = [];

  if (answers.longueur) {
    const hit = normalizeText(book.nb_pages_categorie) === normalizeText(answers.longueur);
    formatParts.push(hit ? 1 : 0);
    if (hit) formatReasons.push(book.nb_pages_categorie);
  }
  if (answers.formatPhysique) {
    const hit =
      normalizeText(book.format_physique) === normalizeText(answers.formatPhysique);
    formatParts.push(hit ? 1 : 0);
    if (hit) formatReasons.push(book.format_physique);
  }
  if (answers.poidsTransport) {
    const hit =
      normalizeText(book.poids_transport) === normalizeText(answers.poidsTransport);
    formatParts.push(hit ? 1 : 0);
    if (hit) formatReasons.push(book.poids_transport);
  }

  const formatActive = formatParts.length > 0;
  const formatScore = formatActive
    ? formatParts.reduce((sum, v) => sum + v, 0) / formatParts.length
    : 0;
  if (formatReasons.length > 0) {
    reasons.push(`Format : ${formatReasons.join(' • ')}`);
  }

  // 4. Rythme, Série & Fin préférée
  const narrativeParts: number[] = [];
  const narrativeReasons: string[] = [];

  if (answers.rythme) {
    const hit = normalizeText(book.rythme) === normalizeText(answers.rythme);
    narrativeParts.push(hit ? 1 : 0);
    if (hit) narrativeReasons.push(book.rythme);
  }
  if (answers.profilSerie) {
    const hit = normalizeText(book.profil_serie) === normalizeText(answers.profilSerie);
    narrativeParts.push(hit ? 1 : 0);
    if (hit) narrativeReasons.push(book.profil_serie);
  }
  if (answers.finHistoire) {
    const hit = normalizeText(book.fin_histoire) === normalizeText(answers.finHistoire);
    narrativeParts.push(hit ? 1 : 0);
    if (hit) narrativeReasons.push(book.fin_histoire);
  }

  const narrativeActive = narrativeParts.length > 0;
  const narrativeScore = narrativeActive
    ? narrativeParts.reduce((sum, v) => sum + v, 0) / narrativeParts.length
    : 0;
  if (narrativeReasons.length > 0) {
    reasons.push(narrativeReasons.join(' • '));
  }

  // 5. Budget maximum
  const budgetRes = computeBudgetMatch(answers, book);
  if (budgetRes.reason) {
    reasons.push(budgetRes.reason);
  }

  const breakdown: CriterionBreakdown[] = [
    {
      key: 'humeur',
      label: 'Humeur',
      score: humeurScore,
      weight: QUIZ_WEIGHTS.humeur,
      active: humeurActive,
    },
    {
      key: 'genres_themes',
      label: 'Genres & Thèmes',
      score: genresThemesScore,
      weight: QUIZ_WEIGHTS.genres_themes,
      active: genresThemesActive,
    },
    {
      key: 'format_lecture',
      label: 'Format & Temps de lecture',
      score: formatScore,
      weight: QUIZ_WEIGHTS.format_lecture,
      active: formatActive,
    },
    {
      key: 'rythme_serie_fin',
      label: 'Rythme, Série & Fin',
      score: narrativeScore,
      weight: QUIZ_WEIGHTS.rythme_serie_fin,
      active: narrativeActive,
    },
    {
      key: 'budget',
      label: 'Budget',
      score: budgetRes.score,
      weight: QUIZ_WEIGHTS.budget,
      active: budgetRes.active,
    },
  ];

  const activeCriteria = breakdown.filter((c) => c.active);
  const activeWeightSum = activeCriteria.reduce((sum, c) => sum + c.weight, 0);

  let ratio = 1;
  if (activeWeightSum > 0) {
    ratio =
      activeCriteria.reduce((sum, c) => sum + c.score * c.weight, 0) /
      activeWeightSum;
  } else {
    // Toutes les étapes sont sur « Peu importe » : tout le catalogue est compatible
    reasons.push(`${book.genre_principal} • ${book.humeurs.join(', ')}`);
    if (book.prix_indicatif_eur) {
      reasons.push(`Prix indicatif : ${book.prix_indicatif_eur}`);
    }
  }

  const scorePercent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);

  return {
    book,
    scorePercent,
    reasons: reasons.slice(0, 5),
    breakdown,
    isWithinBudget: budgetRes.withinBudget,
  };
}

/**
 * Retourne les meilleures recommandations (Top N, par défaut 5) triées par score.
 */
export function getTopRecommendations(
  books: Book[],
  answers: QuizAnswers,
  limit = 5
): MatchResult[] {
  const results = books.map((book) => scoreBookForQuiz(book, answers));

  results.sort((a, b) => {
    if (b.scorePercent !== a.scorePercent) {
      return b.scorePercent - a.scorePercent;
    }
    if (a.isWithinBudget !== b.isWithinBudget) {
      return a.isWithinBudget ? -1 : 1;
    }
    if (b.reasons.length !== a.reasons.length) {
      return b.reasons.length - a.reasons.length;
    }
    return a.book.id - b.book.id;
  });

  return results.slice(0, limit);
}

export function createEmptyQuizAnswers(): QuizAnswers {
  return {
    humeurs: [],
    genres: [],
    themes: [],
    longueur: null,
    formatPhysique: null,
    poidsTransport: null,
    rythme: null,
    profilSerie: null,
    finHistoire: null,
    tranchePrix: null,
    maxBudgetEur: null,
  };
}
