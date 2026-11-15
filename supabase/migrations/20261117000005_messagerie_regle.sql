-- Sooqly – étape 7 (correction) : la règle « annonces de mes discussions » passe par une fonction
-- qui lit les discussions sans repasser par les règles d'accès (sinon : boucle entre annonces et discussions).
create or replace function prive.je_discute_de(p_annonce uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.annonce_id = p_annonce and (select auth.uid()) in (c.acheteur_id, c.vendeur_id)
  );
$$;
revoke all on function prive.je_discute_de(uuid) from public;
grant execute on function prive.je_discute_de(uuid) to authenticated;

drop policy "annonces de mes discussions" on public.listings;
create policy "annonces de mes discussions" on public.listings for select to authenticated
  using (prive.je_discute_de(id));
