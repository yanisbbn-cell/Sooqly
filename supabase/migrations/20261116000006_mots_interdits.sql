-- Sooqly – étape 5 : détecteur de mots interdits, appliqué aussi par la base.
-- Mêmes règles que l'appli (et la maquette) :
--   - texte normalisé (minuscules, sans accents ni harakât, hamza ramenée à alif) ;
--   - mot latin de 5 lettres ou plus : un mot du texte qui COMMENCE par lui (« guitare » → « guitares ») ;
--   - mot latin plus court : mot identique (« vin » n'attrape pas « vintage ») ;
--   - mot arabe : présent n'importe où dans le texte.
-- Famille « professionnel » : seulement pour un particulier (il doit passer en Professionnel).

create or replace function prive.familles_detectees(p_texte text, p_est_pro boolean)
returns text[] language sql stable security definer set search_path = '' as $$
  with t as (select prive.normaliser(p_texte) as x)
  select coalesce(array_agg(distinct f.cle order by f.cle), '{}')
  from public.banned_terms b
  join public.banned_families f on f.cle = b.famille
  cross join t
  where (f.effet = 'interdit' or (f.effet = 'professionnel' and not p_est_pro))
    and case
      when b.langue = 'ar' then position(prive.normaliser(b.terme) in t.x) > 0
      when char_length(b.terme) >= 5 then t.x ~ ('(^|[^a-z0-9])' || prive.normaliser(b.terme))
      else t.x ~ ('(^|[^a-z0-9])' || prive.normaliser(b.terme) || '([^a-z0-9]|$)')
    end;
$$;

create or replace function prive.verifier_mots()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  familles text[];
  est_pro boolean;
begin
  if (select auth.uid()) is null then return new; end if;
  select p.est_pro into est_pro from public.profiles p where p.id = new.auteur_id;
  familles := prive.familles_detectees(
    new.titre || ' ' || new.description || ' ' ||
    coalesce((select string_agg(v, ' ') from jsonb_each_text(new.caracteristiques) as x(k, v)), ''),
    coalesce(est_pro, false)
  );
  if cardinality(familles) > 0 then
    raise exception 'Annonce non conforme : %', array_to_string(familles, ', ') using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger verifier_mots before insert or update of titre, description, caracteristiques on public.listings
  for each row execute function prive.verifier_mots();
