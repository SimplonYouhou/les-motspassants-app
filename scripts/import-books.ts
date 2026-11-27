import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import {
  parseAndValidateBookRows,
  type RawBookCsvRow,
} from '../src/lib/catalog/csvParser';

function loadDotEnvIfPresent(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main(): Promise<void> {
  loadDotEnvIfPresent();

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const csvPath = path.resolve(
    process.cwd(),
    process.argv[2] ?? 'data/2026-11-17_Catalogue-Livres.csv'
  );

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'Erreur : VITE_SUPABASE_URL (ou SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY sont requis.'
    );
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`Erreur : fichier CSV introuvable à l'emplacement ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rawRows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as RawBookCsvRow[];

  const { validBooks, issues } = parseAndValidateBookRows(rawRows);

  console.log('=== Rapport de validation du catalogue ===');
  console.log(`Fichier : ${csvPath}`);
  console.log(`Lignes lues : ${rawRows.length}`);
  console.log(`Livres valides : ${validBooks.length}`);
  console.log(`Lignes rejetées / doublons : ${issues.length}`);

  if (issues.length > 0) {
    console.warn('\nDétail des lignes non importées :');
    for (const issue of issues) {
      console.warn(
        `  - Ligne ${issue.lineNumber} (ID="${issue.idRaw}", ISBN="${issue.isbnRaw}", Titre="${issue.titleRaw}") : ${issue.reason}`
      );
    }
  }

  if (validBooks.length === 0) {
    console.error('Aucun livre valide à importer. Arrêt.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // On n'envoie que les colonnes issues du CSV pour ne jamais écraser cover_url/summary déjà enrichis.
  const payload = validBooks.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    isbn_13: book.isbn_13,
    genre_principal: book.genre_principal,
    sous_categories: book.sous_categories,
    humeurs: book.humeurs,
    themes: book.themes,
    styles_lecture: book.styles_lecture,
    rythme: book.rythme,
    langage_chapitres: book.langage_chapitres,
    profil_serie: book.profil_serie,
    types_personnages: book.types_personnages,
    types_histoire: book.types_histoire,
    fin_histoire: book.fin_histoire,
    format_physique: book.format_physique,
    nb_pages_categorie: book.nb_pages_categorie,
    nb_pages_approx: book.nb_pages_approx,
    poids_transport: book.poids_transport,
    tranche_prix: book.tranche_prix,
    prix_indicatif_eur: book.prix_indicatif_eur,
    tags_synthese: book.tags_synthese,
  }));

  const { error, count } = await supabase
    .from('books')
    .upsert(payload, { onConflict: 'isbn_13', count: 'exact' });

  if (error) {
    console.error("Erreur lors de l'import Supabase :", error.message);
    process.exit(1);
  }

  console.log(`\nImport terminé avec succès (${count ?? validBooks.length} livres traités).`);
}

main().catch((err) => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});
