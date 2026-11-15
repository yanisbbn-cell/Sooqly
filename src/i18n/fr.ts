/** Textes en français. Chaque texte doit aussi exister dans ar.ts. */
export const fr = {
  app: {
    tagline: 'Tout se trouve près de chez vous.',
  },
  langue: {
    bouton: 'عربي',
    aria: 'Passer en arabe',
    titre: 'Langue',
    actuelle: 'Français',
  },
  onglets: {
    annonces: 'Annonces',
    messages: 'Messages',
    publier: 'Publier',
    publierAria: 'Publier une annonce',
    favoris: 'Favoris',
    compte: 'Compte',
  },
  ecrans: {
    annonces: {
      titre: 'Annonces',
      bientot: 'Les annonces arriveront à l’étape 4 du plan.',
    },
    messages: {
      titre: 'Messages',
      bientot: 'La messagerie arrivera à l’étape 7 du plan.',
    },
    publier: {
      titre: 'Publier une annonce',
      bientot: 'L’assistant de publication arrivera à l’étape 4 du plan.',
    },
    favoris: {
      titre: 'Favoris',
      bientot: 'Les favoris arriveront à l’étape 10 du plan.',
    },
    compte: {
      titre: 'Compte',
      bientot: 'La connexion et l’inscription arriveront à l’étape 3 du plan.',
      revoir: 'Revoir la présentation',
      charte: 'Notre charte',
      charteSous: 'Vente, achat et location dans le respect de la charia',
      wilaya: 'Ma wilaya (aperçu)',
      wilayaSous: 'Choisissez votre wilaya',
    },
  },
  commun: {
    retour: 'Retour',
    fermer: 'Fermer',
    chargement: 'Chargement…',
    erreur: 'Impossible de charger les données. Vérifiez votre connexion internet.',
    reessayer: 'Réessayer',
  },
  charte: {
    titre: 'Notre charte',
    basmala: 'بسم الله الرحمن الرحيم',
  },
  wilayas: {
    titre: 'Choisir la wilaya',
    recherche: 'Nom ou numéro (ex. : Oran, 31)',
    aucune: 'Aucune wilaya ne correspond.',
  },
  accueil: {
    passer: 'Passer',
    suivant: 'Suivant',
    creerCompte: 'Créer mon compte',
    decouvrir: 'Découvrir sans compte',
    progression: 'Écran {{n}} sur 3',
    t1: 'Tout se trouve près de chez vous',
    s1: 'Achetez, vendez, louez et donnez, dans les 69 wilayas : logements, véhicules, meubles, électroménager, services…',
    t2: 'Un marché conforme à nos principes',
    s2: 'Une charte claire, des annonces vérifiées avant publication.',
    p1: 'Aucun intérêt (riba), aucune enchère',
    p2: 'Pas de photos d’êtres animés',
    p3: 'Produits et services licites uniquement',
    p4: 'Prix clairs, en dinars',
    verset:
      '« Ô vous qui avez cru ! Ne mangez pas vos biens entre vous illicitement, mais qu’il y ait du négoce par consentement mutuel. » (An-Nisâ’, 29)',
    t3: 'La confiance avant tout',
    s3: 'Chaque membre vérifie son téléphone. Après chaque échange, acheteur et vendeur se notent en quelques secondes. À 10 ventes notées 5 étoiles : le badge « Vendeur validé ».',
  },
};

type Textes<T> = { [K in keyof T]: T[K] extends string ? string : Textes<T[K]> };

/** Forme que doit respecter chaque langue (les mêmes clés que le français). */
export type Traduction = Textes<typeof fr>;
