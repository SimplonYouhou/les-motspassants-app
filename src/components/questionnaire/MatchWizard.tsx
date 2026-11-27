import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { CatalogFacets, QuizAnswers } from '../../types/book';

interface MatchWizardProps {
  facets: CatalogFacets;
  answers: QuizAnswers;
  onChangeAnswers: (next: QuizAnswers) => void;
  onComplete: () => void;
  onReset: () => void;
}

const STEPS = [
  {
    id: 1,
    shortLabel: 'Humeur',
    title: 'Quelle humeur recherchez-vous ?',
    subtitle:
      'Choisissez une ou plusieurs atmosphères de lecture, ou sélectionnez « Peu importe ».',
  },
  {
    id: 2,
    shortLabel: 'Genres & Thèmes',
    title: 'Vos genres et thèmes favoris',
    subtitle:
      'Affinez vos envies littéraires du moment, ou laissez-vous surprendre.',
  },
  {
    id: 3,
    shortLabel: 'Format & Temps',
    title: 'Format & temps de lecture',
    subtitle:
      'Une lecture courte pour le trajet ou un grand roman immersif à savourer ?',
  },
  {
    id: 4,
    shortLabel: 'Rythme & Fin',
    title: 'Rythme, série & dénouement',
    subtitle:
      'Précisez la cadence et le type de fin qui vous feront vibrer.',
  },
  {
    id: 5,
    shortLabel: 'Budget',
    title: 'Votre budget maximum',
    subtitle:
      'Choisissez une tranche ou fixez un plafond en euros (ou « Peu importe »).',
  },
] as const;

function toggleArrayItem(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

interface SingleChoiceGroupProps {
  label: string;
  options: string[];
  value: string | null;
  onChange: (next: string | null) => void;
}

function SingleChoiceGroup({
  label,
  options,
  value,
  onChange,
}: SingleChoiceGroupProps) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-semibold text-midnight">{label}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`min-h-[42px] rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
            value === null
              ? 'border-midnight bg-midnight text-white shadow-xs'
              : 'border-border-editorial bg-paper text-ink-muted hover:border-midnight/40 hover:text-midnight'
          }`}
        >
          Peu importe
        </button>
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(selected ? null : option)}
              className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                selected
                  ? 'border-terracotta bg-terracotta-light text-terracotta-dark shadow-xs'
                  : 'border-border-editorial bg-paper text-midnight hover:border-terracotta/50 hover:bg-cream'
              }`}
            >
              {selected && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MatchWizard({
  facets,
  answers,
  onChangeAnswers,
  onComplete,
  onReset,
}: MatchWizardProps) {
  const [step, setStep] = useState(0);
  const currentStep = STEPS[step];

  const handleClearCurrentStep = () => {
    if (step === 0) {
      onChangeAnswers({ ...answers, humeurs: [] });
    } else if (step === 1) {
      onChangeAnswers({ ...answers, genres: [], themes: [] });
    } else if (step === 2) {
      onChangeAnswers({
        ...answers,
        longueur: null,
        formatPhysique: null,
        poidsTransport: null,
      });
    } else if (step === 3) {
      onChangeAnswers({
        ...answers,
        rythme: null,
        profilSerie: null,
        finHistoire: null,
      });
    } else if (step === 4) {
      onChangeAnswers({
        ...answers,
        tranchePrix: null,
        maxBudgetEur: null,
      });
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkipStep = () => {
    handleClearCurrentStep();
    handleNext();
  };

  const budgetAnySelected =
    answers.tranchePrix === null && answers.maxBudgetEur === null;

  return (
    <section className="mx-auto max-w-4xl">
      {/* En-tête éditorial */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/25 bg-terracotta-light px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-terracotta-dark">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Questionnaire littéraire en 5 étapes
        </span>
        <h1 className="mt-3 font-serif text-3xl font-bold text-midnight sm:text-4xl">
          Trouvez votre prochain coup de cœur
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">
          Répondez selon votre envie du moment : notre moteur analyse l’ensemble du
          catalogue et révèle votre <strong>Top 5</strong> sur mesure.
        </p>
      </div>

      {/* Barre de progression des 5 étapes */}
      <nav aria-label="Étapes du questionnaire" className="mb-6">
        <ol className="grid grid-cols-5 gap-2">
          {STEPS.map((item, index) => {
            const isActive = index === step;
            const isPast = index < step;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  className={`flex w-full flex-col items-start rounded-xl border p-2.5 text-left transition-all sm:p-3 ${
                    isActive
                      ? 'border-terracotta bg-paper shadow-sm'
                      : isPast
                      ? 'border-midnight/20 bg-paper/80 hover:border-midnight/40'
                      : 'border-border-editorial bg-cream-dark/40 hover:bg-paper/60'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isActive
                        ? 'text-terracotta'
                        : isPast
                        ? 'text-midnight'
                        : 'text-ink-muted'
                    }`}
                  >
                    Étape {item.id}/5
                  </span>
                  <span className="mt-0.5 hidden text-xs font-medium text-midnight sm:block truncate w-full">
                    {item.shortLabel}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Carte de l'étape active */}
      <div className="rounded-3xl border border-border-editorial bg-paper p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-editorial pb-5">
          <div>
            <h2 className="font-serif text-2xl font-bold text-midnight">
              {currentStep.title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{currentStep.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onReset();
              setStep(0);
            }}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-cream-dark/60 hover:text-midnight"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Réinitialiser
          </button>
        </div>

        <div className="py-6">
          {/* ÉTAPE 1 : Humeur */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => onChangeAnswers({ ...answers, humeurs: [] })}
                  className={`min-h-[46px] rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                    answers.humeurs.length === 0
                      ? 'border-midnight bg-midnight text-white shadow-xs'
                      : 'border-border-editorial bg-cream/60 text-ink-muted hover:border-midnight/40 hover:text-midnight'
                  }`}
                >
                  Peu importe
                </button>

                {facets.humeurs.map((humeur) => {
                  const active = answers.humeurs.includes(humeur);
                  return (
                    <button
                      key={humeur}
                      type="button"
                      onClick={() =>
                        onChangeAnswers({
                          ...answers,
                          humeurs: toggleArrayItem(answers.humeurs, humeur),
                        })
                      }
                      className={`inline-flex min-h-[46px] items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? 'border-terracotta bg-terracotta-light text-terracotta-dark shadow-xs'
                          : 'border-border-editorial bg-paper text-midnight hover:border-terracotta/50 hover:bg-cream'
                      }`}
                    >
                      {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                      <span>{humeur}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : Genres & Thèmes */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-sm font-semibold text-midnight">
                    Genres principaux
                  </p>
                  {answers.genres.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChangeAnswers({ ...answers, genres: [] })}
                      className="text-xs font-medium text-terracotta hover:underline"
                    >
                      Tout effacer
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeAnswers({ ...answers, genres: [] })}
                    className={`min-h-[40px] rounded-xl border px-3.5 py-1.5 text-sm font-medium transition-all ${
                      answers.genres.length === 0
                        ? 'border-midnight bg-midnight text-white shadow-xs'
                        : 'border-border-editorial bg-paper text-ink-muted hover:border-midnight/40 hover:text-midnight'
                    }`}
                  >
                    Peu importe
                  </button>
                  {facets.genres.map((genre) => {
                    const active = answers.genres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() =>
                          onChangeAnswers({
                            ...answers,
                            genres: toggleArrayItem(answers.genres, genre),
                          })
                        }
                        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm font-medium transition-all ${
                          active
                            ? 'border-terracotta bg-terracotta-light text-terracotta-dark shadow-xs'
                            : 'border-border-editorial bg-paper text-midnight hover:border-terracotta/50 hover:bg-cream'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span>{genre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-sm font-semibold text-midnight">Thèmes favoris</p>
                  {answers.themes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChangeAnswers({ ...answers, themes: [] })}
                      className="text-xs font-medium text-terracotta hover:underline"
                    >
                      Tout effacer
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeAnswers({ ...answers, themes: [] })}
                    className={`min-h-[40px] rounded-xl border px-3.5 py-1.5 text-sm font-medium transition-all ${
                      answers.themes.length === 0
                        ? 'border-midnight bg-midnight text-white shadow-xs'
                        : 'border-border-editorial bg-paper text-ink-muted hover:border-midnight/40 hover:text-midnight'
                    }`}
                  >
                    Peu importe
                  </button>
                  {facets.themes.map((theme) => {
                    const active = answers.themes.includes(theme);
                    return (
                      <button
                        key={theme}
                        type="button"
                        onClick={() =>
                          onChangeAnswers({
                            ...answers,
                            themes: toggleArrayItem(answers.themes, theme),
                          })
                        }
                        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm font-medium transition-all ${
                          active
                            ? 'border-terracotta bg-terracotta-light text-terracotta-dark shadow-xs'
                            : 'border-border-editorial bg-paper text-midnight hover:border-terracotta/50 hover:bg-cream'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span>{theme}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : Format & Temps de lecture */}
          {step === 2 && (
            <div className="space-y-6">
              <SingleChoiceGroup
                label="Longueur & temps de lecture"
                options={facets.longueurs}
                value={answers.longueur}
                onChange={(next) => onChangeAnswers({ ...answers, longueur: next })}
              />
              <SingleChoiceGroup
                label="Format du livre"
                options={facets.formats}
                value={answers.formatPhysique}
                onChange={(next) =>
                  onChangeAnswers({ ...answers, formatPhysique: next })
                }
              />
              <SingleChoiceGroup
                label="Encombrement / transport"
                options={facets.poids}
                value={answers.poidsTransport}
                onChange={(next) =>
                  onChangeAnswers({ ...answers, poidsTransport: next })
                }
              />
            </div>
          )}

          {/* ÉTAPE 4 : Rythme, Série & Fin */}
          {step === 3 && (
            <div className="space-y-6">
              <SingleChoiceGroup
                label="Rythme de lecture"
                options={facets.rythmes}
                value={answers.rythme}
                onChange={(next) => onChangeAnswers({ ...answers, rythme: next })}
              />
              <SingleChoiceGroup
                label="Histoire indépendante ou série"
                options={facets.series}
                value={answers.profilSerie}
                onChange={(next) => onChangeAnswers({ ...answers, profilSerie: next })}
              />
              <SingleChoiceGroup
                label="Fin préférée"
                options={facets.fins}
                value={answers.finHistoire}
                onChange={(next) => onChangeAnswers({ ...answers, finHistoire: next })}
              />
            </div>
          )}

          {/* ÉTAPE 5 : Budget maximum */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <p className="mb-2.5 text-sm font-semibold text-midnight">
                  Par tranche de prix
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeAnswers({
                        ...answers,
                        tranchePrix: null,
                        maxBudgetEur: null,
                      })
                    }
                    className={`min-h-[42px] rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                      budgetAnySelected
                        ? 'border-midnight bg-midnight text-white shadow-xs'
                        : 'border-border-editorial bg-paper text-ink-muted hover:border-midnight/40 hover:text-midnight'
                    }`}
                  >
                    Peu importe
                  </button>

                  {facets.tranchesPrix.map((tranche) => {
                    const selected = answers.tranchePrix === tranche;
                    return (
                      <button
                        key={tranche}
                        type="button"
                        onClick={() =>
                          onChangeAnswers({
                            ...answers,
                            tranchePrix: selected ? null : tranche,
                          })
                        }
                        className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                          selected
                            ? 'border-terracotta bg-terracotta-light text-terracotta-dark shadow-xs'
                            : 'border-border-editorial bg-paper text-midnight hover:border-terracotta/50 hover:bg-cream'
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span>{tranche}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border-editorial bg-cream/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="budget-slider"
                    className="text-sm font-semibold text-midnight"
                  >
                    Plafond précis en euros (optionnel)
                  </label>
                  <span className="rounded-full bg-paper px-3 py-1 text-sm font-bold text-terracotta-dark border border-border-editorial">
                    {answers.maxBudgetEur !== null
                      ? `Jusqu’à ${answers.maxBudgetEur} €`
                      : 'Aucun plafond'}
                  </span>
                </div>

                <input
                  id="budget-slider"
                  type="range"
                  min={Math.max(4, facets.minPriceEur)}
                  max={Math.max(25, facets.maxPriceEur)}
                  step={1}
                  value={answers.maxBudgetEur ?? Math.max(25, facets.maxPriceEur)}
                  onChange={(e) =>
                    onChangeAnswers({
                      ...answers,
                      maxBudgetEur: Number.parseInt(e.target.value, 10),
                    })
                  }
                  className="mt-3 w-full accent-terracotta cursor-pointer"
                />

                <div className="mt-1 flex justify-between text-xs text-ink-muted">
                  <span>{Math.max(4, facets.minPriceEur)} €</span>
                  <span>{Math.max(25, facets.maxPriceEur)} €</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de navigation du wizard */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-editorial pt-5">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-editorial bg-paper px-4 py-2 text-sm font-medium text-midnight transition-colors hover:bg-cream-dark/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Précédent</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSkipStep}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-cream-dark/60 hover:text-midnight"
            >
              Peu importe, passer
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-terracotta px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-terracotta-dark"
            >
              <span>
                {step === STEPS.length - 1 ? 'Découvrir mon Top 5' : 'Continuer'}
              </span>
              {step === STEPS.length - 1 ? (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
