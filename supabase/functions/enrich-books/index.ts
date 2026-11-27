// Edge Function Supabase : enrich-books
// Déclenchement manuel uniquement avec le secret x-admin-secret.
// Complète les champs vides (couverture, résumé) via Open Library puis Google Books en secours.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

interface BookRow {
  id: number;
  title: string;
  author: string;
  isbn_13: string;
  cover_url: string | null;
  summary: string | null;
}

interface EnrichmentResult {
  coverUrl: string | null;
  summary: string | null;
  source: string | null;
}

const BATCH_LIMIT = 20;
const DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchFromOpenLibrary(isbn: string): Promise<EnrichmentResult> {
  let coverUrl: string | null = null;
  let summary: string | null = null;

  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`
    );
    if (res.ok) {
      const json = (await res.json()) as Record<string, Record<string, unknown>>;
      const entry = json[`ISBN:${isbn}`];
      if (entry) {
        const cover = entry.cover as Record<string, unknown> | undefined;
        coverUrl =
          cleanText(cover?.large) ??
          cleanText(cover?.medium) ??
          cleanText(cover?.small);

        if (typeof entry.notes === 'string') {
          summary = cleanText(entry.notes);
        } else if (
          entry.notes &&
          typeof entry.notes === 'object' &&
          'value' in entry.notes
        ) {
          summary = cleanText((entry.notes as { value?: unknown }).value);
        }
      }
    }

    // Essai direct de la notice ISBN Open Library pour récupérer une description
    if (!summary) {
      const editionRes = await fetch(
        `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`
      );
      if (editionRes.ok) {
        const edition = (await editionRes.json()) as Record<string, unknown>;
        if (typeof edition.description === 'string') {
          summary = cleanText(edition.description);
        } else if (
          edition.description &&
          typeof edition.description === 'object' &&
          'value' in edition.description
        ) {
          summary = cleanText((edition.description as { value?: unknown }).value);
        }

        // Si la description se trouve au niveau du work parent
        if (!summary && Array.isArray(edition.works) && edition.works.length > 0) {
          const workKey = (edition.works[0] as { key?: unknown })?.key;
          if (typeof workKey === 'string' && workKey.startsWith('/works/')) {
            const workRes = await fetch(`https://openlibrary.org${workKey}.json`);
            if (workRes.ok) {
              const work = (await workRes.json()) as Record<string, unknown>;
              if (typeof work.description === 'string') {
                summary = cleanText(work.description);
              } else if (
                work.description &&
                typeof work.description === 'object' &&
                'value' in work.description
              ) {
                summary = cleanText((work.description as { value?: unknown }).value);
              }
            }
          }
        }
      }
    }

    // Vérifie si la couverture Open Library directe existe
    if (!coverUrl) {
      const directCover = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false`;
      const imgCheck = await fetch(directCover, { method: 'HEAD' });
      if (imgCheck.ok) {
        coverUrl = directCover;
      }
    }
  } catch {
    // Erreur réseau gérée par le secours Google Books
  }

  return {
    coverUrl,
    summary,
    source: coverUrl || summary ? 'openlibrary' : null,
  };
}

async function fetchFromGoogleBooks(isbn: string): Promise<EnrichmentResult> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`
    );
    if (!res.ok) {
      return { coverUrl: null, summary: null, source: null };
    }
    const json = (await res.json()) as {
      items?: Array<{
        volumeInfo?: {
          description?: string;
          imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
          };
        };
      }>;
    };

    const volume = json.items?.[0]?.volumeInfo;
    if (!volume) {
      return { coverUrl: null, summary: null, source: null };
    }

    const rawImg =
      cleanText(volume.imageLinks?.thumbnail) ??
      cleanText(volume.imageLinks?.smallThumbnail);
    const coverUrl = rawImg ? rawImg.replace(/^http:\/\//i, 'https://') : null;
    const summary = cleanText(volume.description);

    return {
      coverUrl,
      summary,
      source: coverUrl || summary ? 'google_books' : null,
    };
  } catch {
    return { coverUrl: null, summary: null, source: null };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adminSecret = Deno.env.get('ADMIN_SECRET') ?? '';
  const providedSecret = req.headers.get('x-admin-secret') ?? '';

  if (!adminSecret || !constantTimeEqual(providedSecret, adminSecret)) {
    return new Response(JSON.stringify({ error: 'Accès refusé.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Variables Supabase manquantes.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: books, error: fetchError } = await supabase
    .from('books')
    .select('id, title, author, isbn_13, cover_url, summary')
    .eq('is_enriched', false)
    .order('id', { ascending: true })
    .limit(BATCH_LIMIT);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const report = {
    processed: 0,
    enriched: [] as Array<{ id: number; title: string; sources: string[] }>,
    incomplete: [] as Array<{ id: number; title: string; missing: string[] }>,
    errors: [] as Array<{ id: number; title: string; error: string }>,
  };

  for (const book of (books ?? []) as BookRow[]) {
    report.processed += 1;

    try {
      let nextCover = cleanText(book.cover_url);
      let nextSummary = cleanText(book.summary);
      const sources: string[] = [];

      // 1. Priorité Open Library (ne remplit que les champs vides)
      if (!nextCover || !nextSummary) {
        const ol = await fetchFromOpenLibrary(book.isbn_13);
        if (!nextCover && ol.coverUrl) {
          nextCover = ol.coverUrl;
          sources.push('openlibrary');
        }
        if (!nextSummary && ol.summary) {
          nextSummary = ol.summary;
          if (!sources.includes('openlibrary')) sources.push('openlibrary');
        }
      }

      // 2. Secours Google Books si encore incomplet
      if (!nextCover || !nextSummary) {
        const gb = await fetchFromGoogleBooks(book.isbn_13);
        if (!nextCover && gb.coverUrl) {
          nextCover = gb.coverUrl;
          sources.push('google_books');
        }
        if (!nextSummary && gb.summary) {
          nextSummary = gb.summary;
          if (!sources.includes('google_books')) sources.push('google_books');
        }
      }

      const { error: updateError } = await supabase
        .from('books')
        .update({
          cover_url: nextCover,
          summary: nextSummary,
          is_enriched: true,
          enriched_source: sources.length > 0 ? sources.join('+') : null,
          enriched_at: new Date().toISOString(),
        })
        .eq('id', book.id);

      if (updateError) {
        report.errors.push({
          id: book.id,
          title: book.title,
          error: updateError.message,
        });
      } else if (nextCover && nextSummary) {
        report.enriched.push({ id: book.id, title: book.title, sources });
      } else {
        const missing: string[] = [];
        if (!nextCover) missing.push('cover_url');
        if (!nextSummary) missing.push('summary');
        report.incomplete.push({ id: book.id, title: book.title, missing });
      }
    } catch (err) {
      report.errors.push({
        id: book.id,
        title: book.title,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }

    await sleep(DELAY_MS);
  }

  return new Response(JSON.stringify(report), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
