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
  /** Les caractéristiques de type « nombre » sont enregistrées en nombres (pour les filtres min / max). */
  caracteristiques: Record<string, string | number>;
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
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      .filter(([, v]) => v !== ''),
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

// ---------- Lecture des annonces (étape 4, morceau 2) ----------

export type AuteurAnnonce = {
  id: string;
  nom_affiche: string;
  avatar: number | null;
  est_pro: boolean;
  nom_commercial: string | null;
  cree_le: string;
};

export type AnnonceResume = {
  id: string;
  type: TypeAnnonce;
  categorie: string;
  sous_categorie_id: number | null;
  titre: string;
  prix_da: number;
  etat: Etat | null;
  ville: string | null;
  wilaya_code: number;
  statut: StatutAnnonce;
  publie_le: string | null;
  sponsorise_jusqu: string | null;
  auteur: Pick<AuteurAnnonce, 'est_pro'> | null;
  /** Photos visibles par la personne connectée (le public ne voit que les photos acceptées). */
  photos?: PhotoAnnonce[];
};

export type PhotoAnnonce = {
  fichier: string;
  ordre: number;
  angle: string | null;
  decision_moderation: 'en_attente' | 'acceptee' | 'refusee';
  resultat_detecteur: { source?: string; detail?: { interdit?: boolean; objets?: { classe: string; score: number }[]; erreur?: boolean } } | null;
};

/** Photo principale : la première dans l'ordre parmi celles qu'on a le droit de voir. */
export const photoPrincipale = (a: Pick<AnnonceResume, 'photos'>) =>
  [...(a.photos ?? [])].sort((x, y) => x.ordre - y.ordre)[0]?.fichier ?? null;

export type Annonce = AnnonceResume & {
  description: string;
  caracteristiques: Record<string, string | number>;
  motif_refus: string | null;
  expire_le: string | null;
  auteur_id: string;
  auteur: AuteurAnnonce | null;
};

// Deux liens existent entre annonces et profils (auteur, acheteur) : on précise celui de l'auteur.
const RESUME =
  'id, type, categorie, sous_categorie_id, titre, prix_da, etat, ville, wilaya_code, statut, publie_le, sponsorise_jusqu, auteur:profiles!listings_auteur_id_fkey(est_pro), photos:listing_photos(fichier, ordre, angle, decision_moderation, resultat_detecteur)';
const COMPLET =
  'id, type, categorie, sous_categorie_id, titre, prix_da, etat, ville, wilaya_code, statut, publie_le, sponsorise_jusqu, description, caracteristiques, motif_refus, expire_le, auteur_id, auteur:profiles!listings_auteur_id_fkey(id, nom_affiche, avatar, est_pro, nom_commercial, cree_le), photos:listing_photos(fichier, ordre, angle, decision_moderation, resultat_detecteur)';

export const estSponsorisee = (a: Pick<AnnonceResume, 'sponsorise_jusqu'>) =>
  !!a.sponsorise_jusqu && new Date(a.sponsorise_jusqu).getTime() > Date.now();

/**
 * Annonces visibles par tous (en ligne ou réservées), les plus récentes d'abord.
 * Seules les annonces sponsorisées passent devant ; le badge « Vendeur validé » ne change jamais l'ordre.
 */
export async function listerAnnonces(filtre: { categorie?: string | null; sousCategories?: number[] }) {
  let requete = supabase.from('listings').select(RESUME).in('statut', ['en_ligne', 'reserve']);
  if (filtre.categorie) requete = requete.eq('categorie', filtre.categorie);
  if (filtre.sousCategories?.length) requete = requete.in('sous_categorie_id', filtre.sousCategories);
  const { data, error } = await requete.order('publie_le', { ascending: false }).limit(200);
  if (error) throw error;
  const liste = data as unknown as AnnonceResume[];
  return [...liste.filter(estSponsorisee), ...liste.filter((a) => !estSponsorisee(a))];
}

export async function lireAnnonce(id: string): Promise<Annonce | null> {
  const { data, error } = await supabase.from('listings').select(COMPLET).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as Annonce | null;
}

// ---------- Modération provisoire (le vrai espace arrive à l'étape 12) ----------

export async function listerAValider(): Promise<AnnonceResume[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(RESUME)
    .eq('statut', 'verification')
    .order('cree_le', { ascending: true });
  if (error) throw error;
  return data as unknown as AnnonceResume[];
}

export async function validerAnnonce(id: string, dureeJours: number) {
  const maintenant = new Date();
  const fin = new Date(maintenant.getTime() + dureeJours * 24 * 3600 * 1000);
  const { error } = await supabase
    .from('listings')
    .update({ statut: 'en_ligne', publie_le: maintenant.toISOString(), expire_le: fin.toISOString(), motif_refus: null })
    .eq('id', id);
  return !error;
}

export async function refuserAnnonce(id: string, motif: string) {
  const { error } = await supabase
    .from('listings')
    .update({ statut: 'refuse', motif_refus: motif.trim() || null })
    .eq('id', id);
  return !error;
}
