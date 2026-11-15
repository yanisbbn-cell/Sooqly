-- Sooqly – étape 3 : décision de Yanis du 15 novembre 2026.
-- Le numéro de téléphone est OBLIGATOIRE pour s'inscrire, mais il n'est pas vérifié par SMS
-- (les SMS sont payants). La colonne « telephone_verifie » reste à « faux » : elle servira
-- le jour où la vérification par SMS sera activée.
-- Un profil ne peut être créé que si :
--   1. le compte a un numéro de téléphone ;
--   2. la charte a été acceptée ;
--   3. la wilaya et la ville sont renseignées.

create or replace function prive.proteger_profil()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  a_un_telephone boolean;
begin
  -- Les opérations côté serveur (sans utilisateur connecté) ne sont pas limitées.
  if (select auth.uid()) is null then return new; end if;

  if tg_op = 'INSERT' then
    if prive.est_admin() then return new; end if;

    select coalesce(u.phone, '') <> '' into a_un_telephone from auth.users u where u.id = new.id;
    if not coalesce(a_un_telephone, false) then
      raise exception 'Numéro de téléphone obligatoire : inscription impossible' using errcode = 'P0001';
    end if;
    if new.charte_version is null then
      raise exception 'Charte non acceptée : inscription impossible' using errcode = 'P0001';
    end if;
    if new.wilaya_code is null or coalesce(btrim(new.ville), '') = '' then
      raise exception 'Wilaya et ville obligatoires' using errcode = 'P0001';
    end if;

    new.nom_affiche := btrim(new.nom_affiche);
    new.ville := btrim(new.ville);
    new.telephone_verifie := false;
    new.charte_acceptee_le := now();
    new.charte_version := (select s.version_charte from public.settings s where s.id = 1);
    new.role := 'membre';
    new.suspendu := false;
    new.est_pro := false;
    new.cree_le := now();
    return new;
  end if;

  if not prive.est_admin() and new.role is distinct from old.role then
    raise exception 'Modification du rôle interdite';
  end if;
  if not prive.est_moderateur() and new.suspendu is distinct from old.suspendu then
    raise exception 'Modification de la suspension interdite';
  end if;
  if new.telephone_verifie is distinct from old.telephone_verifie then
    raise exception 'La vérification du téléphone est faite par le serveur';
  end if;
  if new.code_parrainage is distinct from old.code_parrainage or new.parrain_id is distinct from old.parrain_id then
    raise exception 'Le parrainage ne peut pas être modifié';
  end if;
  if new.cree_le is distinct from old.cree_le then
    raise exception 'Date de création non modifiable';
  end if;
  return new;
end $$;
