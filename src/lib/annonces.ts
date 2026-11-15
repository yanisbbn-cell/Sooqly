import { supabase } from './supabase';

/** Annonces : types partagés et envoi d'une nouvelle annonce. */

export type TypeAnnonce = 'vente' | 'location' | 'service' | 'don';
export type Etat = 'neuf' | 'tres_bon' | 'bon' | 'satisfaisant' | 'mauvais';
export const ETATS: Etat[] = ['neuf', 'tres_bon', 'bon', 'satisfaisant', 'mauvais'];
export type StatutAnnonce = 'verification' | 'en_ligne' | 'reserve' | 'vendu' | 'loue' | 'expire' | 'refuse';
export type ActivitePro = 'agence' | 'garage' | 'location' | 'autre';
export const ACTIVITES_PRO: ActivitePro[] = ['agence', 'garage', 'location', 'autre'];

/** La catégorie impose le type : Dons → don (gratuit), Services → service, sinon vente. */
export const typePourCategorie = (categorie: string): Exclude<TypeAnnonce, 'location'> =>
  categorie === 'dons' ? 'don' : categorie === 'services' ? 'service' : 'vente';

/** L'état de l'objet n'a pas de sens pour l'immobilier et les services. */
export const etatDemande = (categorie: string) => !!categorie && !['immobilier', 'services'].includes(categorie);

export type NouvelleAnnonce = {
  auteurId: string;
  categorie: string;
  sousCategorieId: number | null;
  titre: string;
  description: string;
  etat: Etat | null;
  caracteristiques: Record<string, string>;
  prixDa: number;
  wilaya: number;
  ville: string;
  pro: { activite: ActivitePro; nomCommercial: string } | null;
};

/**
 * Envoie l'annonce : elle part « En vérification » (la base l'impose) et n'apparaît
 * qu'après validation par un modérateur.
 */
export async function envoyerAnnonce(a: NouvelleAnnonce): Promise<{ id: string | null; erreur: boolean }> {
  if (a.pro) {
    const { error } = await supabase
      .from('profiles')
      .update({ est_pro: true, activite_pro: a.pro.activite, nom_commercial: a.pro.nomCommercial })
      .eq('id', a.auteurId);
    if (error) return { id: null, erreur: true };
  }
  const caracteristiques = Object.fromEntries(
    Object.entries(a.caracteristiques)
      .map(([k, v]) => [k, v.trim()])
      .filter(([, v]) => v),
  );
  const { data, error } = await supabase
    .from('listings')
    .insert({
      auteur_id: a.auteurId,
      type: typePourCategorie(a.categorie),
      categorie: a.categorie,
      sous_categorie_id: a.sousCategorieId,
      titre: a.titre.trim(),
      description: a.description.trim(),
      etat: etatDemande(a.categorie) ? a.etat : null,
      caracteristiques,
      prix_da: a.categorie === 'dons' ? 0 : a.prixDa,
      wilaya_code: a.wilaya,
      ville: a.ville.trim(),
    })
    .select('id')
    .single();
  return { id: data?.id ?? null, erreur: !!error };
}
