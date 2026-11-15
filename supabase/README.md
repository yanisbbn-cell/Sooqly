# Base de données Supabase

Projet Supabase : `Sooqly` (région Paris, eu-west-3).

## Fichiers

- `migrations/` : les changements de la base, à appliquer dans l'ordre.
  - `…_schema.sql` : les tables du cahier des charges (section 6).
  - `…_rls.sql` : les règles d'accès (RLS) sur toutes les tables, et les déclencheurs qui protègent les champs réservés à la modération.
  - `…_donnees_depart.sql` : 69 wilayas, catégories et sous-catégories, mots interdits, charte (13 articles), réglages. Repris de `docs/maquette-sooqly.html`.
- `tests/rls.sql` : tests des règles d'accès avec des comptes fictifs (visiteur, membres, modérateur). Le test se termine volontairement par l'erreur `TESTS_OK` pour tout annuler : la base reste intacte.

## Appliquer ou tester (Claude Code)

Avec le jeton Supabase rangé dans l'environnement Claude (jamais dans Git) :

```sh
# appliquer une migration
node -e 'process.stdout.write(JSON.stringify({name:"nom",query:require("fs").readFileSync(process.argv[1],"utf8")}))' FICHIER.sql \
  | curl -sS -X POST https://api.supabase.com/v1/projects/asaltwruyylfoktdnnkw/database/migrations \
    -H "Authorization: Bearer $JETON" -H "Content-Type: application/json" --data-binary @-

# lancer les tests : la réponse doit contenir « TESTS_OK »
node -e 'process.stdout.write(JSON.stringify({query:require("fs").readFileSync("supabase/tests/rls.sql","utf8")}))' \
  | curl -sS https://api.supabase.com/v1/projects/asaltwruyylfoktdnnkw/database/query \
    -H "Authorization: Bearer $JETON" -H "Content-Type: application/json" --data-binary @-
```
