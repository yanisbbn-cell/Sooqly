-- Sooqly – étape 7 : messagerie.

-- 1. Coordonnées masquées automatiquement dans les messages : les échanges restent dans Sooqly.
--    E-mails ; numéros de téléphone = 9 chiffres ou plus commençant par 0, + ou 00 (les prix ne sont pas touchés).
create or replace function prive.masquer_coordonnees(t text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  r text := t;
begin
  if r is null then return null; end if;
  r := regexp_replace(r, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '•••', 'g');
  -- Remplacement des numéros : on garde les suites de chiffres trop courtes pour être un téléphone.
  r := (
    select string_agg(
      case when morceau ~ '^(\+|00|0)[0-9][0-9 .\-]{6,}[0-9]$' and length(regexp_replace(morceau, '[^0-9]', '', 'g')) >= 9
           then '•••' else morceau end, '' order by n)
    from (
      select n, morceau
      from regexp_split_to_table(regexp_replace(r, '((\+|00|0)[0-9][0-9 .\-]{6,}[0-9])', '§\1§', 'g'), '§') with ordinality as x(morceau, n)
    ) y
  );
  return r;
end $$;

create or replace function prive.preparer_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.contenu := prive.masquer_coordonnees(new.contenu);
  new.lieu_nom := prive.masquer_coordonnees(new.lieu_nom);
  new.lu := false;
  new.cree_le := now();
  return new;
end $$;
create trigger preparer_message before insert on public.messages
  for each row execute function prive.preparer_message();

-- 2. Liste « Messages » : une ligne par discussion, avec l'autre membre, le dernier message et les non-lus.
--    Fonction ordinaire (droits de la personne connectée) : les règles d'accès s'appliquent.
create or replace function public.mes_discussions()
returns table (
  id uuid,
  annonce_id uuid,
  annonce_titre text,
  annonce_categorie text,
  autre_id uuid,
  autre_nom text,
  autre_avatar smallint,
  je_suis_vendeur boolean,
  dernier_type text,
  dernier_contenu text,
  dernier_auteur uuid,
  dernier_le timestamptz,
  non_lus int
)
language sql stable set search_path = '' as $$
  select c.id, c.annonce_id, l.titre, l.categorie,
    p.id, coalesce(case when p.est_pro then p.nom_commercial end, p.nom_affiche), p.avatar,
    c.vendeur_id = (select auth.uid()),
    m.type, m.contenu, m.auteur_id, coalesce(m.cree_le, c.cree_le),
    (select count(*)::int from public.messages x where x.conversation_id = c.id and not x.lu and x.auteur_id <> (select auth.uid()))
  from public.conversations c
  join public.listings l on l.id = c.annonce_id
  join public.profiles p on p.id = case when c.acheteur_id = (select auth.uid()) then c.vendeur_id else c.acheteur_id end
  left join lateral (
    select y.type, y.contenu, y.auteur_id, y.cree_le from public.messages y
    where y.conversation_id = c.id order by y.cree_le desc, y.id desc limit 1
  ) m on true
  order by coalesce(m.cree_le, c.cree_le) desc;
$$;
grant execute on function public.mes_discussions() to authenticated;

-- Un membre peut lire le titre d'une annonce dont il discute, même si elle n'est plus en ligne.
create policy "annonces de mes discussions" on public.listings for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.annonce_id = listings.id and (select auth.uid()) in (c.acheteur_id, c.vendeur_id)
  ));

-- 3. Temps réel : les nouveaux messages arrivent sans recharger (les règles d'accès s'appliquent aussi).
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
