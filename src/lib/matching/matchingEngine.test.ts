import { describe, expect, it } from 'vitest';
import { loadLocalCatalog } from '../catalog/catalogLoader';
import {
  createEmptyQuizAnswers,
  getTopRecommendations,
  scoreBookForQuiz,
} from './matchingEngine';

describe('Catalogue CSV (PapaParse)', () => {
  it('charge et valide les 50 livres du catalogue réel sans erreur', () => {
    const { books, issues, facets } = loadLocalCatalog();
    expect(issues).toHaveLength(0);
    expect(books).toHaveLength(50);
    expect(books[0].isbn_13).toMatch(/^\d{13}$/);
    expect(books[0].humeurs.length).toBeGreaterThan(0);
    expect(books[0].prix_eur_num).toBeGreaterThan(0);
    expect(facets.genres.length).toBeGreaterThan(5);
    expect(facets.humeurs.length).toBeGreaterThan(3);
  });
});

describe('Moteur de matchmaking (5 étapes)', () => {
  const { books } = loadLocalCatalog();

  it('retourne 100 % et les raisons quand toutes les préférences ciblent un livre précis', () => {
    const target = books.find((b) => b.id === 1)!; // Changer l'eau des fleurs
    const answers = {
      ...createEmptyQuizAnswers(),
      humeurs: ['Émotion'],
      genres: [target.genre_principal],
      themes: ['Famille'],
      longueur: target.nb_pages_categorie,
      formatPhysique: target.format_physique,
      rythme: target.rythme,
      profilSerie: target.profil_serie,
      finHistoire: target.fin_histoire,
      tranchePrix: target.tranche_prix,
      maxBudgetEur: 12,
    };

    const match = scoreBookForQuiz(target, answers);
    expect(match.scorePercent).toBe(100);
    expect(match.isWithinBudget).toBe(true);
    expect(match.reasons.length).toBeGreaterThanOrEqual(4);
  });

  it('ne pénalise pas le score lorsqu’une étape est laissée sur "Peu importe"', () => {
    const target = books.find((b) => b.id === 6)!; // The Love Hypothesis
    const answers = {
      ...createEmptyQuizAnswers(),
      humeurs: ['Joie'],
      genres: ['Romance'],
      // Étapes 3, 4, 5 sur "Peu importe"
    };

    const match = scoreBookForQuiz(target, answers);
    expect(match.scorePercent).toBe(100);
  });

  it('retourne exactement le Top 5 classé par compatibilité décroissante', () => {
    const answers = {
      ...createEmptyQuizAnswers(),
      humeurs: ['Suspense'],
      genres: ['Thriller', 'Policier'],
      rythme: 'Rythme rapide',
      maxBudgetEur: 15,
    };

    const top5 = getTopRecommendations(books, answers, 5);
    expect(top5).toHaveLength(5);
    for (let i = 1; i < top5.length; i += 1) {
      expect(top5[i - 1].scorePercent).toBeGreaterThanOrEqual(top5[i].scorePercent);
    }
  });
});
