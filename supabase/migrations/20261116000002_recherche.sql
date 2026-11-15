-- Sooqly – étape 4 : recherche dans les annonces.
-- Le titre, la description et les caractéristiques sont recopiés, normalisés, dans « texte_recherche » :
-- minuscules, sans accents, sans harakât, hamza ramenée à alif (comme l'appli).

create extension if not exists unaccent with schema extensions;

create or replace function prive.normaliser(t text)
returns text language sql immutable set search_path = '' as $$
  select translate(
    regexp_replace(lower(extensions.unaccent(coalesce(t, ''))), '[ً-ْ]', '', 'g'),
    'أإآ’''', 'ااا'
  );
$$;

alter table public.listings add column texte_recherche text not null default '';

create or replace function prive.texte_recherche()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.texte_recherche := prive.normaliser(
    new.titre || ' ' || new.description || ' ' ||
    coalesce((select string_agg(v, ' ') from jsonb_each_text(new.caracteristiques) as x(k, v)), '')
  );
  return new;
end $$;

create trigger texte_recherche before insert or update of titre, description, caracteristiques on public.listings
  for each row execute function prive.texte_recherche();

update public.listings set titre = titre;
create index listings_prix_idx on public.listings (prix_da);
