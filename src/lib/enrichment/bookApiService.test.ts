import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchEnrichedBookMetadata,
  getLocalCoverUrl,
  getOpenLibraryCoverUrl,
  sanitizeIsbn,
} from './bookApiService';
import {
  clearBookMetadataCache,
  getCachedBookMetadata,
  updateCachedCoverOutcome,
} from './metadataCache';

describe('bookApiService & metadataCache', () => {
  beforeEach(() => {
    clearBookMetadataCache();
    vi.restoreAllMocks();
  });

  it('nettoie un ISBN-13 en ne conservant uniquement que les chiffres', () => {
    expect(sanitizeIsbn('978-2-266-23285-2')).toBe('9782266232852');
    expect(sanitizeIsbn(' 978 2266 232852 ')).toBe('9782266232852');
    expect(getLocalCoverUrl('978-2-266-23285-2')).toBe('/covers/9782266232852.jpg');
    expect(getOpenLibraryCoverUrl('978-2-266-23285-2')).toBe(
      'https://covers.openlibrary.org/b/isbn/9782266232852-L.jpg?default=false'
    );
  });

  it('utilise Google Books en fallback quand Open Library ne renvoie rien', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('openlibrary.org')) {
        return new Response(JSON.stringify({}), { status: 200 });
      }
      if (url.includes('googleapis.com/books/v1/volumes?q=isbn:9782266232852')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                volumeInfo: {
                  title: 'Exemple',
                  publisher: 'Pocket',
                  publishedDate: '2014-05-01',
                  description: 'Un résumé de test.',
                  imageLinks: {
                    thumbnail: 'http://books.google.com/books/content?id=abc&img=1&edge=curl',
                  },
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const record = await fetchEnrichedBookMetadata('978-2-266-23285-2');
    expect(record.isbn_13).toBe('9782266232852');
    expect(record.googleCoverUrl).toBe(
      'https://books.google.com/books/content?id=abc&img=1'
    );
    expect(record.coverSource).toBe('none');
    expect(record.publisher).toBe('Pocket');
    expect(record.publishYear).toBe('2014');
    expect(record.synopsis).toBe('Un résumé de test.');
  });

  it('met en cache le repli typographique pour éviter de boucler sur des 404', () => {
    const updated = updateCachedCoverOutcome('9782266232852', null, 'typographic');
    expect(updated?.coverSource).toBe('typographic');
    const cached = getCachedBookMetadata('978-2-266-23285-2');
    expect(cached?.coverSource).toBe('typographic');
    expect(cached?.coverUrl).toBeNull();
  });
});
