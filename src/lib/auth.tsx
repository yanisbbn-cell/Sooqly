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
  suspendu: boolean;
  est_pro: boolean;
  /** Homme ou femme : PRIVÉ (lu par mon_sexe, jamais visible des autres) ; sert à la règle des cours particuliers. */
  sexe: Sexe | null;
  /** Vrai si le sexe n'a pas pu être lu (réseau) : on ne pose alors pas la question. */
  sexeInconnu?: boolean;
};

export type Sexe = 'h' | 'f';

/** Clés de traduction « compte.erreurs.* ». */
export type ErreurCompte =
  | 'compteExistant'
  | 'tropDeDemandes'
  | 'identifiants'
  | 'motDePasseFaible'
  | 'reseau'
  | 'ancienMotDePasse'
  | 'administrateur'
  | 'captcha'
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
    sexe: Sexe;
    motDePasse: string;
    langue: 'fr' | 'ar';
    /** Jeton du CAPTCHA Cloudflare Turnstile (à usage unique). */
    captcha: string | null;
  }) => Promise<Resultat>;
  connecter: (numero: string, motDePasse: string, captcha: string | null) => Promise<Resultat>;
  changerAvatar: (numero: number) => Promise<Resultat>;
  /** Pour les membres inscrits avant la règle : une seule fois (ensuite, seule la modération corrige). */
  definirSexe: (sexe: Sexe) => Promise<Resultat>;
  /** Vérifie l'ancien mot de passe, puis enregistre le nouveau. */
  changerMotDePasse: (ancien: string, nouveau: string, captcha: string | null) => Promise<Resultat>;
  deconnecter: () => Promise<void>;
  /** Vérifie le mot de passe, puis efface le compte et ses données (voir supprimer_mon_compte). */
  supprimerCompte: (motDePasse: string, captcha: string | null) => Promise<Resultat>;
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
  if (code === 'captcha_failed' || message.includes('captcha')) return 'captcha';
  if (message.includes('network') || message.includes('fetch')) return 'reseau';
  return defaut;
}

const COLONNES = 'id, nom_affiche, wilaya_code, ville, avatar, telephone_verifie, role, suspendu, est_pro';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);

  const chargerProfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfil(null);
      return;
    }
    const [{ data }, { data: sexe, error: erreurSexe }] = await Promise.all([
      supabase.from('profiles').select(COLONNES).eq('id', s.user.id).maybeSingle(),
      supabase.rpc('mon_sexe'),
    ]);
    setProfil(data ? ({ ...data, sexe: (sexe as Sexe | null) ?? null, sexeInconnu: !!erreurSexe } as Profil) : null);
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
    async ({ telephone, nomAffiche, wilaya, ville, avatar, sexe, motDePasse, langue, captcha }) => {
      // 1. Le compte (numéro + mot de passe). Si une tentative précédente s'est arrêtée après cette étape
      //    (coupure de réseau), on reprend avec la session déjà ouverte pour ce même numéro.
      let { data: s } = await supabase.auth.getSession();
      if (s.session && chiffres(s.session.user.phone ?? '') !== chiffres(telephone)) {
        await supabase.auth.signOut({ scope: 'local' });
        s = { session: null };
      }
      let sessionCourante = s.session;
      if (!sessionCourante) {
        const { data, error } = await supabase.auth.signUp({ phone: telephone, password: motDePasse, options: { captchaToken: captcha ?? undefined } });
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
          sexe,
          langue,
          charte_version: 1,
        })
        .select(COLONNES)
        .single();
      if (error) return { erreur: traduireErreur(error, 'inconnue') };
      setProfil({ ...(data as Omit<Profil, 'sexe'>), sexe });
      return { erreur: null };
    },
    [],
  );

  const connecter = useCallback<Auth['connecter']>(
    async (numero, motDePasse, captcha) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: numero,
        password: motDePasse,
        options: { captchaToken: captcha ?? undefined },
      });
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
      setProfil({ ...profil, ...(data as Omit<Profil, 'sexe'>) });
      return { erreur: null };
    },
    [profil],
  );

  const definirSexe = useCallback<Auth['definirSexe']>(
    async (sexe) => {
      if (!profil) return { erreur: 'inconnue' };
      const { data, error } = await supabase.rpc('definir_mon_sexe', { p_sexe: sexe });
      if (error || data !== true) return { erreur: traduireErreur(error, 'inconnue') };
      setProfil({ ...profil, sexe });
      return { erreur: null };
    },
    [profil],
  );

  const changerMotDePasse = useCallback<Auth['changerMotDePasse']>(async (ancien, nouveau, captcha) => {
    const { data: s } = await supabase.auth.getSession();
    const telephone = s.session?.user.phone;
    if (!telephone) return { erreur: 'inconnue' };
    // On vérifie l'ancien mot de passe en se reconnectant avec : quelqu'un qui emprunte le téléphone ne peut pas le changer.
    const verif = await supabase.auth.signInWithPassword({
      phone: `+${telephone.replace(/^\+/, '')}`,
      password: ancien,
      options: { captchaToken: captcha ?? undefined },
    });
    if (verif.error) return { erreur: verif.error.code === 'invalid_credentials' ? 'ancienMotDePasse' : traduireErreur(verif.error, 'inconnue') };
    const { error } = await supabase.auth.updateUser({ password: nouveau });
    return { erreur: error ? traduireErreur(error, 'inconnue') : null };
  }, []);

  const deconnecter = useCallback(async () => {
    // Ce téléphone ne doit plus recevoir les notifications de ce compte.
    const { retirerJetonDuTelephone } = await import('./notifications');
    await retirerJetonDuTelephone();
    // « local » : ne déconnecte que cet appareil.
    await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
    setProfil(null);
  }, []);

  const supprimerCompte = useCallback<Auth['supprimerCompte']>(async (motDePasse, captcha) => {
    const { data: s } = await supabase.auth.getSession();
    const telephone = s.session?.user.phone;
    if (!telephone) return { erreur: 'inconnue' };
    const verif = await supabase.auth.signInWithPassword({
      phone: `+${telephone.replace(/^\+/, '')}`,
      password: motDePasse,
      options: { captchaToken: captcha ?? undefined },
    });
    if (verif.error) return { erreur: verif.error.code === 'invalid_credentials' ? 'ancienMotDePasse' : traduireErreur(verif.error, 'inconnue') };
    const { data, error } = await supabase.rpc('supprimer_mon_compte');
    if (error) return { erreur: traduireErreur(error, 'inconnue') };
    if (data !== true) return { erreur: 'administrateur' };
    // Le compte n'existe plus : on oublie la session sur cet appareil.
    await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
    setProfil(null);
    return { erreur: null };
  }, []);

  const valeur = useMemo(
    () => ({ pret, profil, inscrire, connecter, changerAvatar, definirSexe, changerMotDePasse, deconnecter, supprimerCompte }),
    [pret, profil, inscrire, connecter, changerAvatar, definirSexe, changerMotDePasse, deconnecter, supprimerCompte],
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

/** Vrai seulement pour l'administrateur (réglages, mise en avant, rôles, charte). */
export const estAdmin = (p: Profil | null) => p?.role === 'admin';
