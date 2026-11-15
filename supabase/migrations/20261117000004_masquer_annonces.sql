-- Sooqly – étape 7 : comme dans les messages, les numéros et e-mails écrits dans le titre ou la description
-- d'une annonce sont masqués (cahier des charges, section 7 : coordonnées jamais affichées publiquement).
create or replace function prive.masquer_annonce()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.titre := prive.masquer_coordonnees(new.titre);
  new.description := prive.masquer_coordonnees(new.description);
  return new;
end $$;
create trigger masquer_annonce before insert or update of titre, description on public.listings
  for each row execute function prive.masquer_annonce();
