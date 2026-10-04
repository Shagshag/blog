---
publish: true
title: Le Dockerfile disait `fr_FR.UTF-8`. PHP voyait `C.UTF-8`
created: 2026-09-14T23:10:00
modified: 2026-10-04T16:59
tags:
  - symfony
  - php
  - aws
  - docker
  - retour-d-experience
---

_Le Dockerfile décrit ce que le container devrait avoir. Il ne prouve pas ce que l'application utilise réellement._

_Also available in [[The Dockerfile said `fr_FR.UTF-8`. PHP saw `C.UTF-8`|English]]._

Un bug de locale a ceci de trompeur qu'on croit toujours connaître la configuration du serveur (après tout, c'est nous qui l'avons écrite, dans un Dockerfile versionné). Le problème est de confondre ce que le container **déclare** avec ce que le processus applicatif **utilise réellement**.

Ce billet raconte comment cet écart a été mis en évidence, puis comment un correctif a été vérifié directement dans une tâche ECS Fargate qui tourne en recette, via [ECS Exec](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html), sans déploiement dédié ni environnement de staging séparé. La mécanique d'ECS Exec elle-même (retrouver sa tâche, prérequis IAM, quoting) est détaillée à part dans [[ECS Exec en pratique - retrouver sa tâche, ouvrir la session, passer un script sans se battre avec le quoting|un article dédié]]. Ici, l'accent est mis sur ce que le diagnostic a révélé.

## Le bug

Une fonction de normalisation de chaînes, utilisée pour dédupliquer des entrées avant un [`flush()` Doctrine](https://www.doctrine-project.org/projects/doctrine-orm/en/3.6/reference/working-with-objects.html#persisting-entities), retirait les accents avec la méthode classique :

```php
iconv('UTF-8', 'ASCII//TRANSLIT', $string);
```

`//TRANSLIT` fait partie des [extensions de comportement](https://man7.org/linux/man-pages/man3/iconv_open.3.html) proposées par les implémentations d'`iconv` (une extension GNU, absente de la norme POSIX). Sous Linux, le résultat dépend notamment de l'implémentation utilisée et de la locale `LC_CTYPE` du process qui l'exécute : un [rapport de bug glibc](https://www.mail-archive.com/debian-glibc@lists.debian.org/msg59606.html) documente précisément ce cas, le même appel `iconv -f utf-8 -t ascii//TRANSLIT` réussissant sous `en_US.utf8` et échouant sous `C.UTF-8`. Sous une locale `C` stricte, la translittération échoue silencieusement : `"Matériel"` devient `"Mat?riel"` au lieu de `"Materiel"`.

Donc la clé de déduplication calculée côté PHP était censée correspondre à la collation `ci` de MySQL, insensible à la casse **et** aux accents. Sous locale `C`, ça ne marchait pas. Un doublon échappait donc à la déduplication applicative et finissait par percuter une contrainte d'unicité en base au moment du `flush()` (un crash en aval d'un problème de normalisation en amont).

Le correctif retenu remplace `iconv` par le composant String de Symfony :

```php
use function Symfony\Component\String\u;

u($string)->ascii()->toString();
```

[`u()->ascii()`](https://symfony.com/doc/current/string.html#methods-added-by-codepointstring-and-unicodestring) effectue la translittération au niveau du composant Symfony, sans dépendre de la locale `LC_CTYPE` de PHP pour ce traitement. Le composant expose aussi un [`AsciiSlugger`](https://symfony.com/doc/current/string.html#slugger) dédié à la génération de slugs (URLs, identifiants) ; ici, le besoin est une clé de déduplication, pas un slug, donc `u()->ascii()` seul suffit, sans les règles de casse et de séparateurs qu'ajouterait le slugger. Les règles de translittération ne sont cela dit pas garanties identiques à celles d'`iconv //TRANSLIT` : c'est une bibliothèque différente, avec ses propres tables Unicode.

On aurait aussi pu initialiser la locale du processus avec `setlocale(LC_ALL, '')`. Ce n'est pas le choix retenu ici : le correctif supprime la dépendance à `LC_CTYPE` plutôt que de la configurer ailleurs.

## « Il suffit de lire le Dockerfile, non ? »

Avant de toucher à AWS : le repo a un pipeline CI/CD versionné ([`.github/workflows/ci.yml`](https://docs.github.com/en/actions/writing-workflows/about-workflows), [`.docker/Dockerfile`](https://docs.docker.com/reference/dockerfile/), une [task definition ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html) `.aws/pro.json`). Est-ce qu'on ne peut pas simplement **lire** ces fichiers pour connaître la configuration du serveur, sans exécuter quoi que ce soit dessus ?

D'après l'analyse statique :

- `.github/workflows/ci.yml` : le déclencheur `on: push: branches: ["main"]` déploie sur le service ECS `pro` (prod), la branche `develop` déploie sur `pro-rct` (recette). **Même Dockerfile, même image** : seul le service ECS cible change.
- `.docker/Dockerfile` fixe une locale française complète dans une instruction `ENV` :

  ```dockerfile
  ENV LANG="fr_FR.UTF-8" \
      LANGUAGE="fr_FR:fr" \
      LC_ALL="fr_FR.UTF-8" \
      ...
  RUN ... && echo "fr_FR.UTF-8 UTF-8" > /etc/locale.gen && locale-gen fr_FR.UTF-8 ...
  ```

  et installe l'extension `ext-intl`.
- La task definition ECS ne contient aucun override de `LANG`/`LC_ALL`/`LC_CTYPE` pour le container `php`. Rien ne vient donc contredire, au niveau ECS, ce que fixe le Dockerfile.

L'environnement OS du container est donc configuré en `fr_FR.UTF-8`, avec `ext-intl` disponible.

Un premier test en direct dans le container (méthode détaillée dans l'[[ECS Exec en pratique - retrouver sa tâche, ouvrir la session, passer un script sans se battre avec le quoting|article sur ECS Exec]]) a mesuré, depuis un script PHP, la locale `LC_CTYPE` courante du process. Comparée aux variables d'environnement à chaque étage, on voit le problème :

```
Dockerfile           LC_ALL=fr_FR.UTF-8
        │
        ▼
PID 1 (entrypoint)    LC_ALL=fr_FR.UTF-8
        │
        ▼
Session ECS Exec      LC_ALL=fr_FR.UTF-8
        │
        ▼
PHP (LC_CTYPE)        C.UTF-8   ← rupture
```

La variable d'environnement est correctement propagée à chaque étage. Mais PHP n'a pas initialisé sa locale `LC_CTYPE` à partir de cette variable.

[PHP démarre avec les catégories de locale dans leur état initial](https://sourceware.org/glibc/manual/latest/html_node/Setting-the-Locale.html). Les variables `LANG`, `LC_ALL`, etc. présentes dans l'environnement ne signifient donc pas, à elles seules, que `LC_CTYPE` du processus PHP a été configuré avec ces valeurs. Un appel à [`setlocale(LC_ALL, '')`](https://www.php.net/setlocale) demande explicitement au processus de synchroniser sa locale avec l'environnement.

La valeur observée ici, `C.UTF-8`, n'est d'ailleurs pas la locale `C` nue : c'est une variante UTF-8 de la locale POSIX. Elle reste distincte de la locale [ICU](https://icu.unicode.org/) utilisée par `ext-intl`, qui résout sa propre locale par défaut indépendamment de `LC_CTYPE`. `iconv()`, lui, dépend directement de la locale du processus fixée par la libc.

Un `grep -r setlocale` sur le code applicatif n'a trouvé que deux appels, tous les deux scopés à `LC_TIME` (formatage de dates), jamais `LC_CTYPE`, jamais de `setlocale(LC_ALL, '')` global. C'est donc bien une absence d'initialisation de `LC_CTYPE`, pas un override caché dans l'application.

L'analyse statique permet donc de vérifier la configuration déclarée. Mais elle ne dit pas encore ce que PHP utilise réellement.

Pour ça, il faut regarder dans le container.
Un container local aurait permis de reproduire le comportement, à condition de reconstruire exactement la même image et le même environnement. Mais le bug concernait la recette : je voulais d'abord vérifier ce que faisait réellement le PHP déjà déployé.

## Vérifier le correctif dans le container réel

Le script de vérification chargeait l'autoloader Composer de l'application (`require '/var/www/vendor/autoload.php';`) puis appelait la méthode privée à tester via `ReflectionMethod`, exactement comme le ferait un test unitaire PHPUnit (la même technique, exécutée sur le déploiement réel plutôt que dans la suite de tests).

```bash
aws ecs execute-command \
  --cluster <nom-du-cluster> --task <task-id> --container php --region <REGION> \
  --interactive \
  --command "/bin/sh -lc 'echo $B64 | base64 -d | php'"
```

Le script transite en base64 plutôt qu'en argument brut. La commande traverse trois couches de shell successives (le shell local, la chaîne `--command`, puis `/bin/sh -c` dans le container), et un script PHP multi-lignes avec guillemets et accents finit toujours par casser les quotes imbriquées. Un `$(... || ...)` avait ainsi échoué avec `Syntax error: "(" unexpected`, non pas à cause d'une erreur de logique shell mais de l'empilement des couches de quoting. Le détour par base64 supprime le problème entièrement.

## Résultat : le correctif tient

```
normalizeString("Matériel") under current locale: materiel
normalizeString("Matériel") forced under LC_CTYPE=C: materiel
raw iconv("Matériel") under LC_CTYPE=C (old, pre-fix behaviour): 'Mat?riel'
```

> [!NOTE]
> Le problème observé en recette est `C.UTF-8`. Pour reproduire le comportement défaillant de l'ancien `iconv`, le test force `LC_CTYPE=C`, qui constitue le cas le plus strict et permet de reproduire le défaut documenté.

On voit que le vieux comportement à base d'`iconv` brut reproduit bien le bug sous `LC_CTYPE=C` et que `u()->ascii()` normalise correctement, avec ou sans locale forcée.

Le code ne dépend plus de `LC_CTYPE`. Un changement de locale du process ne réintroduira pas ce bug.

## Verrouiller le correctif : un test de non-régression

Le test dans le container permet de vérifier le correctif sur le déploiement réel. Il ne protège pas contre une régression future.

Le projet n'a pas de tests fonctionnels avec kernel HTTP. Ce n'est pas un problème ici : forcer la locale ne nécessite ni base de données ni container, seulement `setlocale()`.

```php
final class StringNormalizerTest extends TestCase
{
    public function testAsciiNormalizationIsLocaleIndependent(): void
    {
        $original = setlocale(LC_CTYPE, '0');

        try {
            setlocale(LC_CTYPE, 'C');

            self::assertSame(
                'Materiel',
                StringNormalizer::normalize('Matériel')
            );
        } finally {
            setlocale(LC_CTYPE, $original);
        }
    }
}
```

Le `finally` restaure la locale d'origine après le test, pour ne pas polluer le reste de la suite. Ce test aurait détecté le bug avant sa mise en production car il reproduit la condition qui provoquait le bug : `LC_CTYPE=C`.

## Pourquoi c'est sûr

Faire tourner une commande dans un container de recette ou de prod demande quelques précautions.

Dans ce cas précis :

- le diagnostic était en lecture seule ;
- le script tournait en CLI, dans un process isolé du pool de workers qui sert le trafic réel (Apache/mod\_php) : aucune requête en cours n'était affectée ;
- il ne touchait ni au filesystem, ni à la base de données, ni à quoi que ce soit de partagé ;
- `setlocale()` appelé dans ce process ponctuel n'a d'effet que sur ce process.

Seule réserve : ECS Exec exécute avec les privilèges `root`, ce qui justifie de garder la technique au diagnostic ponctuel en lecture seule, pas à un usage régulier.

Cette conclusion vaut seulement si ECS Exec était déjà actif sur la tâche. L'activer, si ce n'est pas le cas, force un redéploiement complet du service. Ce qui peut avoir des conséquences que ne justifie pas ce diagnostic.

## Conclusion

Le sujet de fond n'était donc pas ECS Exec, mais l'écart entre une configuration déclarée et ce que l'application utilise réellement.

Ici, la variable de locale était bien présente dans le container. PHP ne l'utilisait simplement pas pour `LC_CTYPE`.

Quelques commandes dans le container ont permis de le constater. Le test de non-régression permet maintenant de s'assurer que le code n'en dépend plus.

La configuration dit ce qu'on veut. Le runtime dit ce qui se passe.
