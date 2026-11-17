/**
 * Adresse du site web de Sooqly (version web d'Expo, hébergée sur Vercel).
 * À remplacer par le nom de domaine définitif à l'étape 15.
 */
export const SITE = 'https://sooqly-two.vercel.app';


/**
 * Clé publique (« Site Key ») du CAPTCHA Cloudflare Turnstile, liée au site ci-dessus.
 * Publique par nature ; la clé secrète est rangée uniquement dans Supabase (Authentication → Attack Protection).
 */
export const CLE_CAPTCHA = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAGDZ8ZI3sViA7Gl0';
