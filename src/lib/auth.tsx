import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase, supabaseConfigure } from './supabase';

/**
 * Comptes Sooqly.
 * - Le numéro de téléphone est obligatoire (format international, voir telephone.ts) pour s'inscrire. Il n'est pas vérifié par SMS
 *   (décision de Yanis : les SMS sont payants) ; la vérification pourra être activée plus tard.
 * - Un membre est « connecté » quand il a une session ET un profil (créé à la fin de l'inscription).
 * - La session est gardée sur l'appareil jusqu'à la déconnexion.
 * Le numéro de téléphone reste dans Supabase Auth : il n'est jamais copié dans le profil public.
 */

export type Profil = {
  id: string;
  nom_affiche: string;
  wilaya_code: number | null;
  ville: string | null;
  avatar: number | null;
  telephone_verifie: boolean;
  role: 'membre' | 'moderateur' | 'admin';
};

/** Clés de traduction « compte.erreurs.* ». */
export type ErreurCompte =
  | 'compteExistant'
  | 'tropDeDemandes'
  | 'identifiants'
  | 'motDePasseFaible'
  | 'reseau'
  | 'inconnue';

type Resultat = { erreur: ErreurCompte | null };

type Auth = {
  pret: boolean;
  profil: Profil | null;
  inscrire: (d: {
    /** Numéro complet, format international (« +213… », « +33… »). */
    telephone: string;
    nomAffiche: string;
    wilaya: number;
    ville: string;
    avatar: number | null;
    motDePasse: string;
    langue: 'fr' | 'ar';
  }) => Promise<Resultat>;
  connecter: (numero: string, motDePasse: string) => Promise<Resultat>;
  changerAvatar: (numero: number) => Promise<Resultat>;
  deconnecter: () => Promise<void>;
};

const Contexte = createContext<Auth | null>(null);

const chiffres = (n: string) => n.replace(/\D/g, '');
export const MOT_DE_PASSE_MIN = 8;

function traduireErreur(e: { message?: string; status?: number; code?: string } | null, defaut: ErreurCompte): ErreurCompte {
  if (!e) return defaut;
  const code = e.code ?? '';
  const message = (e.message ?? '').toLowerCase();
  if (e.status === 429 || code.includes('rate_limit')) return 'tropDeDemandes';
  if (code === 'user_already_exists') return 'compteExistant';
  if (code === 'invalid_credentials') return 'identifiants';
  if (code === 'weak_password') return 'motDePasseFaible';
  if (message.includes('network') || message.includes('fetch')) return 'reseau';
  return defaut;
}

const COLONNES = 'id, nom_affiche, wilaya_code, ville, avatar, telephone_verifie, role';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);

  const chargerProfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfil(null);
      return;
    }
    const { data } = await supabase.from('profiles').select(COLONNES).eq('id', s.user.id).maybeSingle();
    setProfil((data as Profil | null) ?? null);
  }, []);

  useEffect(() => {
    if (!supabaseConfigure) {
      setPret(true);
      return;
    }
    let actif = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!actif) return;
        setSession(data.session);
        await chargerProfil(data.session);
      })
      .finally(() => actif && setPret(true));

    const { data: ecoute } = supabase.auth.onAuthStateChange((evenement, s) => {
      setSession(s);
      if (evenement === 'SIGNED_OUT') setProfil(null);
    });
    return () => {
      actif = false;
      ecoute.subscription.unsubscribe();
    };
  }, [chargerProfil]);

  const inscrire = useCallback<Auth['inscrire']>(
    async ({ telephone, nomAffiche, wilaya, ville, avatar, motDePasse, langue }) => {
      // 1. Le compte (numéro + mot de passe). Si une tentative précédente s'est arrêtée après cette étape
      //    (coupure de réseau), on reprend avec la session déjà ouverte pour ce même numéro.
      let { data: s } = await supabase.auth.getSession();
      if (s.session && chiffres(s.session.user.phone ?? '') !== chiffres(telephone)) {
        await supabase.auth.signOut({ scope: 'local' });
        s = { session: null };
      }
      let sessionCourante = s.session;
      if (!sessionCourante) {
        const { data, error } = await supabase.auth.signUp({ phone: telephone, password: motDePasse });
        if (error || !data.session) return { erreur: traduireErreur(error, 'inconnue') };
        sessionCourante = data.session;
        setSession(data.session);
      }

      // 2. Le profil. La base vérifie elle-même le numéro, la charte, la wilaya et la ville
      //    (voir supabase/migrations/…_inscription_sans_sms.sql).
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: sessionCourante.user.id,
          nom_affiche: nomAffiche,
          wilaya_code: wilaya,
          ville,
          avatar,
          langue,
          charte_version: 1,
        })
        .select(COLONNES)
        .single();
      if (error) return { erreur: traduireErreur(error, 'inconnue') };
      setProfil(data as Profil);
      return { erreur: null };
    },
    [],
  );

  const connecter = useCallback<Auth['connecter']>(
    async (numero, motDePasse) => {
      const { data, error } = await supabase.auth.signInWithPassword({ phone: numero, password: motDePasse });
      if (error || !data.session) return { erreur: traduireErreur(error, 'identifiants') };
      setSession(data.session);
      await chargerProfil(data.session);
      return { erreur: null };
    },
    [chargerProfil],
  );

  const changerAvatar = useCallback<Auth['changerAvatar']>(
    async (numero) => {
      if (!profil) return { erreur: 'inconnue' };
      const { data, error } = await supabase.from('profiles').update({ avatar: numero }).eq('id', profil.id).select(COLONNES).single();
      if (error) return { erreur: traduireErreur(error, 'inconnue') };
      setProfil(data as Profil);
      return { erreur: null };
    },
    [profil],
  );

  const deconnecter = useCallback(async () => {
    // « local » : ne déconnecte que cet appareil.
    await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
    setProfil(null);
  }, []);

  const valeur = useMemo(
    () => ({ pret, profil, inscrire, connecter, changerAvatar, deconnecter }),
    [pret, profil, inscrire, connecter, changerAvatar, deconnecter],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/** Vrai pour un modérateur ou un administrateur. */
export const estModerateur = (p: Profil | null) => p?.role === 'moderateur' || p?.role === 'admin';

export function useAuth(): Auth {
  const a = useContext(Contexte);
  if (!a) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return a;
}
