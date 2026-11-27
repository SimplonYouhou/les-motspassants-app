-- Migration initiale : catalogue des livres Les MotsPassants
-- Lecture publique (SELECT) uniquement via RLS. Aucune écriture autorisée depuis le navigateur.

create table if not exists public.books (
  id integer primary key,
  title text not null,
  author text not null,
  isbn_13 text not null unique,
  genre_principal text not null,
  sous_categories text[] not null default '{}',
  humeurs text[] not null default '{}',
  themes text[] not null default '{}',
  styles_lecture text[] not null default '{}',
  rythme text not null default '',
  langage_chapitres text[] not null default '{}',
  profil_serie text not null default '',
  types_personnages text[] not null default '{}',
  types_histoire text[] not null default '{}',
  fin_histoire text not null default '',
  format_physique text not null default '',
  nb_pages_categorie text not null default '',
  nb_pages_approx integer,
  poids_transport text not null default '',
  tranche_prix text not null default '',
  prix_indicatif_eur text not null default '',
  tags_synthese text[] not null default '{}',
  cover_url text,
  summary text,
  is_enriched boolean not null default false,
  enriched_source text,
  enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_books_is_enriched on public.books (is_enriched);
create index if not exists idx_books_genre_principal on public.books (genre_principal);

create or replace function public.set_books_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_books_updated_at on public.books;
create trigger trg_books_updated_at
  before update on public.books
  for each row
  execute function public.set_books_updated_at();

alter table public.books enable row level security;

-- Politique stricte : seule la lecture publique est autorisée depuis le client.
drop policy if exists "Lecture publique du catalogue" on public.books;
create policy "Lecture publique du catalogue"
  on public.books
  for select
  to anon, authenticated
  using (true);
