import type { Periode, Tarif } from './location';
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
  /** Location d'un logement ou d'un véhicule (sinon : type imposé par la catégorie). */
  location?: boolean;
  /** Location de véhicule : le loueur exige le permis du locataire. */
  permisExige?: boolean;
  /** Étape 11 : prix ferme ou légèrement négociable, échange, modes de remise (objets seulement). */
  options: OptionsAnnonce;
  /** Cours particuliers : public choisi par le professeur (règle du même sexe appliquée par la base). */
  publicCours?: PublicCours | null;
};

/** « enfants » : primaire et collège, ouvert à tous les parents ; « adultes » : lycée et adultes, même sexe seulement. */
export type PublicCours = 'enfants' | 'adultes';

export type OptionsAnnonce = {
  prixFerme: boolean;
  echange: boolean;
  mainPropre: boolean;
  livraisonWilaya: boolean;
  envoiAlgerie: boolean;
};

export const OPTIONS_PAR_DEFAUT: OptionsAnnonce = {
  prixFerme: true,
  echange: false,
  mainPropre: true,
  livraisonWilaya: false,
  envoiAlgerie: false,
};

/** Remise et livraison : seulement pour les objets (pas l'immobilier, les véhicules, les services ni les locations). */
export const avecRemise = (categorie: string, location: boolean) =>
  !location && !!categorie && !['immobilier', 'vehicules', 'services'].includes(categorie);

const colonnesOptions = (o: OptionsAnnonce) => ({
  prix_ferme: o.prixFerme,
  echange_accepte: o.echange,
  remise_main_propre: o.mainPropre,
  livraison_wilaya: o.livraisonWilaya,
  envoi_algerie: o.envoiAlgerie,
});

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
      type: a.location ? 'location' : typePourCategorie(a.categorie),
      categorie: a.categorie,
      sous_categorie_id: a.sousCategorieId,
      titre: a.titre.trim(),
      description: a.description.trim(),
      etat: etatDemande(a.categorie) ? a.etat : null,
      caracteristiques,
      prix_da: a.categorie === 'dons' ? 0 : a.prixDa,
      wilaya_code: a.wilaya,
      ville: a.ville.trim(),
      permis_exige: !!a.location && a.categorie === 'vehicules' && !!a.permisExige,
      public_cours: a.publicCours ?? null,
      ...colonnesOptions(a.options),
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
  /** Cours particuliers seulement (sinon null) : public et sexe du professeur. */
  public_cours?: PublicCours | null;
  sexe_auteur?: 'h' | 'f' | null;
  /** Modération : publiée directement (vendeur de confiance) et pas encore revue ; masquée après des signalements. */
  publication_directe?: boolean;
  revue_le?: string | null;
  masquee_signalements?: boolean;
  titre: string;
  prix_da: number;
  etat: Etat | null;
  ville: string | null;
  wilaya_code: number;
  statut: StatutAnnonce;
  publie_le: string | null;
  sponsorise_jusqu: string | null;
  livraison_wilaya: boolean;
  envoi_algerie: boolean;
  auteur: Pick<AuteurAnnonce, 'id' | 'est_pro'> | null;
  /** Photos visibles par la personne connectée (le public ne voit que les photos acceptées). */
  photos?: PhotoAnnonce[];
  /** Tarifs d'une location (vide pour une vente). */
  tarifs?: Tarif[];
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
  permis_exige: boolean;
  prix_ferme: boolean;
  echange_accepte: boolean;
  remise_main_propre: boolean;
  auteur: AuteurAnnonce | null;
  disponibilites?: Periode[];
};

// Deux liens existent entre annonces et profils (auteur, acheteur) : on précise celui de l'auteur.
export const RESUME =
  'id, type, categorie, sous_categorie_id, public_cours, sexe_auteur, titre, prix_da, etat, ville, wilaya_code, statut, publie_le, sponsorise_jusqu, livraison_wilaya, envoi_algerie, auteur:profiles!listings_auteur_id_fkey(id, est_pro), photos:listing_photos(fichier, ordre, angle, decision_moderation, resultat_detecteur), tarifs:listing_rates(unite, prix_da)';
const COMPLET =
  'id, type, categorie, sous_categorie_id, public_cours, sexe_auteur, titre, prix_da, etat, ville, wilaya_code, statut, publie_le, sponsorise_jusqu, publication_directe, revue_le, description, caracteristiques, motif_refus, expire_le, auteur_id, permis_exige, prix_ferme, echange_accepte, remise_main_propre, livraison_wilaya, envoi_algerie, auteur:profiles!listings_auteur_id_fkey(id, nom_affiche, avatar, est_pro, nom_commercial, cree_le), photos:listing_photos(fichier, ordre, angle, decision_moderation, resultat_detecteur), tarifs:listing_rates(unite, prix_da), disponibilites:availability(debut, fin)';

export const estSponsorisee = (a: Pick<AnnonceResume, 'sponsorise_jusqu'>) =>
  !!a.sponsorise_jusqu && new Date(a.sponsorise_jusqu).getTime() > Date.now();

export async function lireAnnonce(id: string): Promise<Annonce | null> {
  const { data, error } = await supabase.from('listings').select(COMPLET).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as Annonce | null;
}

// ---------- Modération : file des annonces à valider (décisions dans lib/moderation.ts) ----------

export async function listerAValider(): Promise<AnnonceResume[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(`${RESUME}, masquee_signalements`)
    .eq('statut', 'verification')
    .order('cree_le', { ascending: true });
  if (error) throw error;
  return data as unknown as AnnonceResume[];
}

/** Annonces publiées directement (vendeurs de confiance), pas encore revues par la modération. */
export async function listerARevoir(): Promise<AnnonceResume[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(RESUME)
    .eq('publication_directe', true)
    .is('revue_le', null)
    .in('statut', ['en_ligne', 'reserve'])
    .order('publie_le', { ascending: true });
  if (error) throw error;
  return data as unknown as AnnonceResume[];
}

/**
 * Après l'envoi de l'annonce et de ses photos : publication directe si le vendeur est de confiance
 * (décidé par la base). Renvoie le statut final (« en_ligne » ou « verification »).
 */
export async function finaliserPublication(id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('finaliser_publication', { p_annonce: id });
  return error ? null : (data as string | null);
}

/** Modération : une annonce publiée directement a été revue et est conforme. */
export async function marquerRevue(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('marquer_revue', { p_annonce: id });
  return !error && data === true;
}

/** Résumés de plusieurs annonces (résultats de la recherche de location). */
export async function lireAnnoncesParIds(ids: string[]): Promise<AnnonceResume[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('listings').select(RESUME).in('id', ids);
  if (error) throw error;
  return data as unknown as AnnonceResume[];
}

/** Annonces visibles d'un membre (profil public). */
export async function annoncesDuMembre(id: string): Promise<AnnonceResume[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(RESUME)
    .eq('auteur_id', id)
    .in('statut', ['en_ligne', 'reserve'])
    .order('publie_le', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as unknown as AnnonceResume[];
}

// ---------- Modifier une annonce (étape 10) ----------

export type ModificationAnnonce = Omit<NouvelleAnnonce, 'auteurId' | 'pro'> & {
  /** Location : tarifs et période de disponibilité, remplacés en entier. */
  tarifs: Tarif[] | null;
  periode: Periode | null;
};

/**
 * Enregistre les modifications. La base décide du statut : seul un changement de prix garde l'annonce en ligne,
 * toute autre modification la renvoie « En vérification ».
 */
export async function modifierAnnonce(id: string, m: ModificationAnnonce): Promise<boolean> {
  const caracteristiques = Object.fromEntries(
    Object.entries(m.caracteristiques)
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      .filter(([, v]) => v !== ''),
  );
  const { error } = await supabase
    .from('listings')
    .update({
      type: m.location ? 'location' : typePourCategorie(m.categorie),
      categorie: m.categorie,
      sous_categorie_id: m.sousCategorieId,
      titre: m.titre.trim(),
      description: m.description.trim(),
      etat: etatDemande(m.categorie) && !m.location ? m.etat : null,
      caracteristiques,
      prix_da: m.categorie === 'dons' ? 0 : m.prixDa,
      wilaya_code: m.wilaya,
      ville: m.ville.trim(),
      permis_exige: !!m.location && m.categorie === 'vehicules' && !!m.permisExige,
      public_cours: m.publicCours ?? null,
      ...colonnesOptions(m.options),
    })
    .eq('id', id);
  if (error) return false;
  if (m.tarifs) {
    const d = await supabase.from('listing_rates').delete().eq('annonce_id', id);
    if (d.error) return false;
    const r = await supabase.from('listing_rates').insert(m.tarifs.map((t) => ({ annonce_id: id, ...t })));
    if (r.error) return false;
  }
  if (m.periode) {
    const d = await supabase.from('availability').delete().eq('annonce_id', id);
    if (d.error) return false;
    const r = await supabase.from('availability').insert({ annonce_id: id, ...m.periode });
    if (r.error) return false;
  }
  return true;
}

export async function lireStatut(id: string): Promise<StatutAnnonce | null> {
  const { data } = await supabase.from('listings').select('statut').eq('id', id).maybeSingle();
  return (data?.statut as StatutAnnonce | undefined) ?? null;
}
