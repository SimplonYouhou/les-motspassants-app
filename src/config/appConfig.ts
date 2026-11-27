import type { Book } from '../types/book';

/**
 * Configuration unique de l'application Les MotsPassants.
 * Modifiez ces valeurs avant la mise en ligne (voir README.md).
 */
export const APP_CONFIG = {
  bookstore: {
    name: 'Les MotsPassants',
    subtitle: 'Le match littéraire',
    city: 'Nantes',
    // Adresse e-mail provisoire : à remplacer avant la mise en ligne
    email: 'blabla@lesmotspassants.fr',
    availabilityText: 'Contactez-nous pour connaître la disponibilité',
    presentation:
      "Librairie indépendante à Nantes, Les MotsPassants vous propose un « match littéraire » : répondez à un court questionnaire, parcourez nos suggestions et demandez la réservation d'un exemplaire physique par e-mail, à retirer et régler en librairie.",
    // Coordonnées à renseigner avant la mise en ligne (rien d'inventé : ce qui manque reste vide)
    address: '',
    hours: '',
    phone: '',
    access: '',
  },
  matching: {
    // Seuil de Match par défaut : 80 %
    matchThresholdPercent: 80,
    // Pondérations exactes définies dans le cahier des charges (somme = 1.00)
    weights: {
      genre: 0.2,
      humeur: 0.15,
      themes: 0.15,
      livres_similaires: 0.15,
      style: 0.1,
      personnages: 0.1,
      type_histoire: 0.1,
      profil_lecteur: 0.05,
    },
  },
} as const;

/**
 * Construit un lien mailto: pour demander la réservation d'un exemplaire en librairie.
 * L'application ne confirme jamais une réservation : elle prépare simplement la demande par e-mail.
 */
export function buildReservationMailto(book: Book): string {
  const subject = `[Les MotsPassants] Demande de disponibilité / réservation — ${book.title}`;
  const lines = [
    'Bonjour,',
    '',
    'Je souhaiterais savoir si le livre suivant est disponible et, le cas échéant, en demander la mise de côté pour un retrait et un règlement en librairie :',
    '',
    `- Titre : ${book.title}`,
    `- Auteur / Autrice : ${book.author}`,
    `- ISBN-13 : ${book.isbn_13}`,
    book.prix_indicatif_eur ? `- Prix indicatif : ${book.prix_indicatif_eur}` : '',
    '',
    'Merci beaucoup et à bientôt en librairie !',
  ].filter((line, index, arr) => {
    if (line !== '') return true;
    return arr[index - 1] !== '';
  });

  return `mailto:${APP_CONFIG.bookstore.email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(lines.join('\n'))}`;
}

/**
 * Construit un lien mailto: général pour écrire à la librairie.
 */
export function buildContactMailto(): string {
  const subject = `[Les MotsPassants] Prise de contact`;
  const body = 'Bonjour l’équipe des MotsPassants,\n\n';
  return `mailto:${APP_CONFIG.bookstore.email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}
