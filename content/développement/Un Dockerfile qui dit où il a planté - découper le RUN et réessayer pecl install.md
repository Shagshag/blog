---
publish: true
title: "Un Dockerfile qui dit où il a planté : découper le RUN et réessayer pecl install"
description: "Un build cassé par un 504 de pecl.php.net après l'annonce de sécurité de PHP : découper un RUN géant pour localiser l'erreur, puis réessayer pecl install extension par extension."
created: 2026-10-21T22:59:00
modified: 2026-10-21T22:59
tags:
  - docker
  - php
  - pecl
  - retour-d-experience
---

_Un build en CI cassé par un 504 de pecl.php.net, noyé au milieu de 40 lignes de `&&`_

_Also available in [[A Dockerfile that says where it failed - splitting the RUN and retrying pecl install|English]]._

Le 20 octobre 2026, [l'équipe sécurité de PHP a annoncé avoir trouvé deux failles critiques](https://www.php.net/archive/2026.php#2026-10-20-1). Une annonce d'une ampleur assez inédite qui a eu de grands retentissements ([Sites officiels mis hors ligne par précaution dans le monde entier](https://www.reuters.com/world/asia-pacific/eu-agency-warns-websites-may-need-be-taken-offline-php-prepares-patches-2026-10-21/), [réaction de Cloudflare](https://blog.cloudflare.com/php-vulnerabilities-waf-protection/), [OpenAI](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/)...). Elle a eu pour nous un effet inattendu. Dans la journée les builds de notre application ont commencé à échouer.

## Le build qui échoue

Je me suis penché sur le [Dockerfile](https://docs.docker.com/reference/dockerfile/) de l'application. Son étape `base` part de l'[image officielle PHP](https://hub.docker.com/_/php) et installe les dépendances. Une quarantaine de lignes sont regroupées dans un seul [`RUN`](https://docs.docker.com/reference/dockerfile/), enchaînées par `&&` : paquets apt, locale, extensions PHP, installation de [Composer](https://getcomposer.org/), `php.ini`, extensions [PECL](https://pecl.php.net/).

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    libfreetype-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libxslt-dev \
    libz-dev \
    ...
    && pecl install redis \
    && pecl install ssh2-1.4 \
    && rm -rf /tmp/pear \
    && docker-php-ext-enable redis \
    && docker-php-ext-enable ssh2
```

Docker affichait seulement ceci :

> [!fail]
> process "/bin/sh -c apt-get update && ..." did not complete successfully: exit code: 1

Aucune indication sur la commande de la chaîne qui avait échoué. J'ai d'abord soupçonné une nouvelle version de Composer. Avec un seul `RUN`, impossible de trancher. Je suis allé voir : Composer n'avait pas publié de nouvelle version, donc la cause était ailleurs. On a décidé de découper le `RUN`.

## Découper en plusieurs RUN

Chaque `RUN` devient une étape numérotée dans [`docker build --progress=plain`](https://docs.docker.com/reference/cli/docker/buildx/build/), par exemple `[base 7/8] RUN pecl install ...`. Elle est [mise en cache](https://docs.docker.com/build/cache/) indépendamment des autres. L'erreur désigne directement le bon bloc, avec le numéro de ligne du Dockerfile.

J'ai fait six `RUN` : paquets, locale, extensions PHP, Composer, `php.ini`, PECL. Un `&&` géant rend Docker aveugle parce que l'unité d'erreur est l'instruction, pas la commande. (`set -eux` aurait tracé chaque commande, mais le build serait resté un seul bloc, sans cache intermédiaire.)

Au build suivant, l'erreur était sur l'[installation PECL](https://www.php.net/manual/en/install.pecl.php) :

> [!fail]
> buildx failed with: ERROR: failed to build: failed to solve: process "/bin/sh -c pecl install redis && pecl install ssh2-1.4 && rm -rf /tmp/pear && docker-php-ext-enable redis && docker-php-ext-enable ssh2" did not complete successfully: exit code: 1

Cela m'a permis de trouver dans le log, un peu plus haut :

> [!fail]
> Could not download from "https://pecl.php.net/get/redis-6.3.0.tgz", cannot download "pecl/redis" (File https://pecl.php.net:443/get/redis-6.3.0.tgz not valid (received: HTTP/1.1 504 Gateway Timeout))

Le problème ne venait pas du code : pecl.php.net était surchargé. Je suppose que la vague de mises à jour qui a suivi l'annonce de PHP a saturé le serveur.

Notre build n'a donc pas été cassé par la faille, qui n'était même pas encore corrigée. Il l'a été par la réaction de tout le monde à l'annonce de sa correction.

## Chercher un miroir PECL

J'ai ensuite cherché un miroir de pecl.php.net à utiliser en secours. Il n'existe pas de miroir officiel utilisable comme ça. Les vraies alternatives sont :

- compiler les extensions depuis les tarballs GitHub avec [`phpize`](https://www.php.net/manual/en/install.pecl.phpize.php)
- passer par [mlocati/docker-php-extension-installer](https://github.com/mlocati/docker-php-extension-installer)
- publier l'image de base dans un registry pour ne plus télécharger quoi que ce soit à chaque déploiement.

La dernière est la plus propre, mais c'est un chantier. Ajouter un outil alors que le build était cassé me paraissait risqué, donc j'ai fait au plus simple avec des tentatives répétées.

## Le retry, en trois versions

Pour faire au plus simple et changer le moins de choses possible, j'ai d'abord mis les deux extensions dans la même boucle :

```dockerfile
RUN for i in 1 2 3 4 5; do pecl install redis ssh2 && break; sleep 10; done
```

En testant le cas d'échec, j'ai vu que ce n'était pas viable. Si `redis` s'installe et que `ssh2` échoue, la tentative suivante échoue sur `redis` avec « already installed », qui renvoie un code non nul. La boucle ne peut jamais converger. Il faut une boucle par extension.

Deuxième version, une boucle par extension. Si les cinq tentatives échouent, le `for` se termine sans `break` et renvoie 0. Le build ne plante alors qu'au `docker-php-ext-enable`, avec un message qui n'a rien à voir avec le problème. Il faut un drapeau et un `exit 1` explicite.

Version finale :

```dockerfile
# pecl.php.net can answer 504 when overloaded: retry each extension separately
# (a combined install would fail on retry with "already installed"), then fail loudly.
RUN set -eu; \
    for ext in redis ssh2-1.4; do \
        ok=0; \
        for attempt in 1 2 3 4 5; do \
            if pecl install "$ext"; then ok=1; break; fi; \
            echo "pecl install $ext failed (attempt $attempt/5), retrying..." >&2; \
            sleep $((attempt * 10)); \
        done; \
        if [ "$ok" != 1 ]; then \
            echo "ERROR: pecl install $ext failed after 5 attempts" >&2; \
            exit 1; \
        fi; \
    done; \
    rm -rf /tmp/pear; \
    docker-php-ext-enable redis ssh2; \
    php --ri redis > /dev/null; \
    php --ri ssh2 > /dev/null
```

L'attente grandit à chaque essai (10 s, 20 s, 30 s, 40 s, 50 s), soit 150 s au total pour une extension qui échoue cinq fois. Le dernier `sleep` est inutile, puisqu'il précède l'abandon. Je l'ai laissé pour ne pas compliquer le Dockerfile.

[`php --ri redis`](https://www.php.net/manual/en/features.commandline.options.php) en fin de bloc vérifie que l'extension est vraiment chargée. [`docker-php-ext-enable`](https://hub.docker.com/_/php) peut réussir alors que l'extension ne se charge pas (une dépendance manquante, par exemple). Dans ce cas `php --ri` échoue, et le build aussi.

## Tester l'échec

Le Dockerfile est [multi-stage](https://docs.docker.com/build/building/multi-stage/). L'étape `base` installe les paquets et les extensions PHP, les suivantes (dépendances Composer, assets front) s'appuient dessus. Je ne construis donc que `base` :

```bash
docker build --progress=plain --target base -f .docker/Dockerfile -t test .
```

Pour vérifier le cas d'échec, j'ai remplacé temporairement `ssh2-1.4` par `ssh2-9.9` (une version qui n'existe pas) sur une copie du Dockerfile. La sortie :

```text
pecl install ssh2-9.9 failed (attempt 5/5), retrying...
ERROR: pecl install ssh2-9.9 failed after 5 attempts
```

Je n'ai pas testé le retry avec un vrai 504, seulement avec une version inexistante. Une version inexistante est une erreur permanente, alors qu'un 504 est temporaire. Ce test montre que l'échec remonte bien, pas que le retry finit par réussir.

## Ce que ça change

Je garde cette solution. Les `RUN` séparés me disent quelle étape a échoué et profitent du cache. Le retry m'évite de relancer un build pour un 504 passager.

Elle ne règle pas le reste. `pecl install redis` sans version installe la dernière, donc le build n'est pas reproductible. Il dépend toujours d'un serveur tiers à chaque déploiement, et il ne survivra pas à une panne de plusieurs heures. C'est une amélioration modeste, adaptée à l'incident que j'ai eu.
