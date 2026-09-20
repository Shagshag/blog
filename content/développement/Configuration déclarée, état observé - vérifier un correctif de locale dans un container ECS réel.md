---
publish: true
created: 2026-09-14T23:10:00
modified: 2026-09-16T07:42
tags:
  - symfony
  - php
  - aws
---

# Configuration déclarée, état observé : vérifier un correctif de locale dans un container ECS réel

_Le Dockerfile dit `fr_FR.UTF-8`. PHP, lui, voit `C.UTF-8`._

Un bug de locale a ceci de trompeur qu'on croit toujours connaître la configuration du serveur (après tout, c'est nous qui l'avons écrite, dans un Dockerfile versionné). Le piège n'est pas un manque de visibilité sur l'environnement. Il est dans l'écart entre ce qu'un container **déclare** et ce qu'un processus applicatif **consomme réellement** de cette déclaration.

Ce billet raconte comment cet écart a été mis en évidence, puis comment un correctif a été vérifié directement dans une tâche ECS Fargate qui tourne en recette, via [ECS Exec](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html), sans déploiement dédié ni environnement de staging séparé. La mécanique d'ECS Exec elle-même (retrouver sa tâche, prérequis IAM, quoting) est détaillée à part dans [[ECS Exec en pratique - retrouver sa tâche, ouvrir la session, passer un script sans se battre avec le quoting|un article dédié]]. Ici, l'accent est mis sur ce que le diagnostic a révélé.

## Le bug

Une fonction de normalisation de chaîne, utilisée pour dédupliquer des entrées avant un [`flush()` Doctrine](https://www.doctrine-project.org/projects/doctrine-orm/en/3.6/reference/working-with-objects.html#persisting-entities), retirait les accents avec la méthode classique :

```php
iconv('UTF-8', 'ASCII//TRANSLIT', $string);
```

`//TRANSLIT` fait partie des [extensions de comportement](https://man7.org/linux/man-pages/man3/iconv_open.3.html) proposées par les implémentations d'`iconv` (une extension GNU, absente de la norme POSIX). Sous Linux, le résultat dépend notamment de l'implémentation utilisée et de la locale `LC_CTYPE` du process qui l'exécute : un [rapport de bug glibc](https://www.mail-archive.com/debian-glibc@lists.debian.org/msg59606.html) documente précisément ce cas, le même appel `iconv -f utf-8 -t ascii//TRANSLIT` réussissant sous `en_US.utf8` et échouant sous `C.UTF-8`. Sous une locale `C` stricte, la translittération échoue silencieusement : `"Matériel"` devient `"Mat?riel"` au lieu de `"Materiel"`.

Conséquence concrète : la clé de déduplication calculée côté PHP était censée correspondre à la collation `ci` de MySQL, insensible à la casse **et** aux accents. Sous locale `C`, ça ne marchait pas. Un doublon échappait donc à la déduplication applicative et finissait par percuter une contrainte d'unicité en base au moment du `flush()` (un crash en aval d'un problème de normalisation en amont).

Le correctif retenu remplace `iconv` par le composant String de Symfony :

```php
use function Symfony\Component\String\u;

u($string)->ascii()->toString();
```

[`u()->ascii()`](https://symfony.com/doc/current/string.html#methods-added-by-codepointstring-and-unicodestring) effectue la translittération au niveau du composant Symfony, sans dépendre de la locale `LC_CTYPE` de PHP pour ce traitement.

## « Il suffit de lire le Dockerfile, non ? »

Avant de toucher à AWS, la question s'est posée légitimement : le repo a un pipeline CI/CD versionné ([`.github/workflows/ci.yml`](https://docs.github.com/en/actions/writing-workflows/about-workflows), [`.docker/Dockerfile`](https://docs.docker.com/reference/dockerfile/), une [task definition ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html) `.aws/pro.json`). Est-ce qu'on ne peut pas simplement **lire** ces fichiers pour connaître la configuration du serveur, sans exécuter quoi que ce soit dessus ?

On peut effectivement connaître la configuration OS/image de cette façon, mais ça ne dit pas ce que PHP voit à l'exécution.

**Ce que l'analyse statique révèle**, sans le moindre accès AWS :

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

La variable d'environnement est correctement propagée à chaque étage (Dockerfile, process d'entrée du container, session ECS Exec elle-même) jusqu'à PHP, qui n'en tient pas compte.

Ce n'est pas une anomalie de PHP, c'est le [comportement documenté de la bibliothèque C sous-jacente](https://sourceware.org/glibc/manual/latest/html_node/Setting-the-Locale.html) que PHP enveloppe : un programme démarre par défaut dans la locale standard `C` et ne synchronise pas automatiquement ses catégories de locale avec les variables d'environnement. [`setlocale(LC_ALL, '')`](https://www.php.net/setlocale) demande explicitement à PHP de les lire (la chaîne vide signifiant « prends la valeur dans l'environnement »). Sans cet appel, PHP ne l'utilise pas pour initialiser sa locale courante.

Un `grep -r setlocale` sur le code applicatif n'a trouvé que deux appels, tous les deux scopés à `LC_TIME` (formatage de dates), jamais `LC_CTYPE`, jamais de `setlocale(LC_ALL, '')` global. D'où l'écart : la variable d'environnement est là, propagée correctement jusqu'au container. Rien dans l'application ne la relaie à la catégorie que `iconv()` consulte.

L'analyse statique (CI/CD, Dockerfile, task definition) donne la configuration déclarée de l'environnement. Rapide, gratuite, sans risque, et une étape à faire systématiquement en premier. Mais connaître cette configuration déclarée ne garantit pas de connaître le comportement réel du processus applicatif : ça, seule l'introspection depuis l'intérieur du container le dit.

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

`u()->ascii()` normalise correctement, avec ou sans locale forcée. Le vieux comportement à base d'`iconv` brut, lui, reproduit bien le bug sous `LC_CTYPE=C` (la preuve que le problème était réel, pas seulement théorique, sur ce même environnement).

Et la locale par défaut réellement vue par PHP (`C.UTF-8`), découplée de la variable déclarée dans le Dockerfile (`fr_FR.UTF-8`), donne au correctif une portée qui dépasse le cas observé : le jour où un process (cron, worker, ou ce même container après un changement d'image de base) tourne sous une locale encore plus stricte, le code n'en dépend plus du tout.

## Verrouiller le correctif : un test de non-régression

Le diagnostic dans le container confirme le correctif à un instant donné, sur ce déploiement précis. Il ne protège pas d'une régression future, par exemple un retour accidentel à `iconv`, ou un nouveau traitement de chaîne qui réintroduirait la même dépendance implicite à `LC_CTYPE`.

L'absence de harnais fonctionnel dans le repo (uniquement des `TestCase` PHPUnit purs, sans kernel HTTP) n'est pas un obstacle ici : forcer la locale ne nécessite ni base de données ni container, seulement `setlocale()`, exactement comme lors du diagnostic sur la tâche réelle.

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

Le `finally` restaure la locale d'origine après le test, pour ne pas polluer le reste de la suite. Ce test aurait détecté le bug avant sa mise en production. Il tourne dans la suite PHPUnit existante, sans dépendance à l'environnement système ni à `ext-intl`, et couvre exactement la régression identifiée en container : `LC_CTYPE=C` strict.

## Pourquoi c'est sûr

Faire tourner une commande dans un container de recette ou de prod fait peur, à raison. Voici pourquoi ce diagnostic précis ne présentait pas de risque, et où sont les limites.

- Un script lancé via `php` en CLI démarre un process isolé, distinct du pool de workers qui sert le trafic réel (Apache/mod\_php dans ce cas précis). Aucune requête en cours n'est affectée.
- Le diagnostic était strictement en lecture : pas d'écriture sur le filesystem du container, pas de modification de base de données, pas de redémarrage de quoi que ce soit.
- `setlocale()` appelé dans ce process ponctuel n'a d'effet que sur ce process. L'état d'une locale est par-process, pas partagé. Aucun impact sur les workers déjà en cours d'exécution.
- ECS Exec exécute les commandes avec les privilèges `root` dans le container. C'est une raison supplémentaire de réserver la technique au diagnostic ponctuel, en lecture seule, plutôt qu'à un usage régulier.

Ce niveau de sûreté suppose qu'ECS Exec est **déjà actif** sur la tâche. Si ce n'est pas le cas, l'activer force un redéploiement complet du service, pas neutre sur un service qui sert du trafic. Le cas décrit ici, c'est l'exécution d'une commande ponctuelle une fois ECS Exec déjà en place. L'activation elle-même est une étape à part, à traiter avec prudence, pas dans l'urgence d'un diagnostic.

## Conclusion

Le sujet de fond n'était pas ECS Exec, mais l'écart entre une configuration déclarée au niveau du conteneur et l'état réellement consommé par l'application. Ici, une variable d'environnement de locale, présente et correcte à chaque étage, mais ignorée par PHP faute d'un `setlocale(LC_ALL, '')` dans le code.

L'analyse statique du pipeline reste toujours la première étape. Mais elle donne la configuration déclarée, pas le comportement observé. Entre les deux, il n'y a que l'introspection depuis l'intérieur du runtime pour trancher. Ici, le doute portait sur une locale PHP. Ailleurs, ce sera un fuseau horaire, un encodage par défaut, une variable que l'application ne lit tout simplement jamais. Le point commun reste le même : le test qu'on veut faire ne peut être joué que là où tourne réellement le service.
