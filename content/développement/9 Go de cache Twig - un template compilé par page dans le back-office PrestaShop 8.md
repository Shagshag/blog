---
publish: true
title: "9 Go de cache Twig : un template compilé par page dans le back-office PrestaShop 8"
created: 2026-10-03T00:00:00
modified: 2026-10-04T16:59
tags:
  - symfony
  - prestashop
  - php
---

_`template_from_string()`, plus de 80 000 fichiers, et un dossier que rien ne purge_

_Also available in [[9 GB of Twig cache - one template compiled per page in the PrestaShop 8 back office|English]]._

Cet article est né d'une digression. Pendant l'incident raconté dans [[14 minutes de cache-warmup sur EFS - quand un back-office PrestaShop devient injoignable|14 minutes de `cache:warmup` sur EFS]], il fallait aussi supprimer un template précis dans le cache Twig (`var/cache/prod/twig/`). En le cherchant je suis tombé sur un dossier de **9 Go**.

```sh
$ du -sh var/cache/prod/twig
9G    var/cache/prod/twig
```

## [C'est beaucoup de noix ça !](https://www.youtube.com/watch?v=kW4L7bpOBAo)

Une recherche dans ce dossier a révélé des dizaines de milliers d'entrées `__string_template__`.

```sh
$ grep -lr '__string_template__' ./var/cache/prod/twig/ 2>/dev/null | wc -l
82173
```

Premier réflexe : chercher un `createTemplate()` maison, dans le code custom.

Il n'y en a pas. Aucun module ne fait ça côté Twig. Les seuls `createTemplate()` du périmètre custom sont des appels Smarty, qui alimentent `var/cache/*/smarty`, pas `var/cache/*/twig`. Hors de cause.

Le vrai coupable est le ~~colonel moutarde~~ cœur de PrestaShop 8 lui-même.

## Le mécanisme : `template_from_string()` sur chaque page

Chaque page du back-office basée sur un `AdminController` legacy (la quasi-totalité du back-office) passe par [`layout.html.twig`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/src/PrestaShopBundle/Resources/views/Admin/layout.html.twig#L25-L40), qui ouvre sur :

```twig
{% extends(template_from_string(
  getLegacyLayout(
    app.request.attributes.get('_legacy_controller'),
    layoutTitle is defined ? layoutTitle : '',
    ...
  )
)) %}
```

[`getLegacyLayout()`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/src/PrestaShopBundle/Twig/LayoutExtension.php#L175-L247) ne se contente pas d'injecter quelques variables. Elle récupère le layout legacy complet, rendu côté Smarty, titre de page, fil d'Ariane, boutons de toolbar avec leurs tokens, lien d'aide, URL admin incluse.

Elle découpe ce HTML autour du marqueur `{$content}`, puis réencode l'en-tête et le pied en une série de littéraux Twig via [`escapeSmarty()`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/src/PrestaShopBundle/Twig/LayoutExtension.php#L249-L260). Twig impose une limite dure de 8191 caractères (`2^13 - 1`) par littéral ; PrestaShop découpe en blocs de 2000 pour rester loin en dessous. Tout ce HTML devient l'argument de `template_from_string()`.

Or ce layout n'est pas le même d'une page à l'autre. Il embarque le titre de la page, le fil d'Ariane, des boutons dont les URL contiennent un token de sécurité, et ces éléments changent selon la page et l'enregistrement affichés. Le HTML obtenu est donc rarement identique d'une requête à l'autre.

Et Twig nomme un template créé à partir d'une chaîne d'après l'empreinte de cette chaîne entière : [`createTemplate()`](https://github.com/twigphp/Twig/blob/3.x/src/Environment.php#L459-L465) produit `__string_template__` suivi du hash du texte. Un seul caractère de différence, et c'est un autre nom, donc un autre fichier compilé dans le cache.

`template_from_string()` compile une nouvelle entrée, `__string_template__<hash>`, à chaque fois. Quasiment jamais réutilisée tellement elle est spécifique.

Ce n'est pas un bug applicatif. C'est le mécanisme qui fait le pont entre l'ancien système de contrôleurs et le rendu Twig moderne, sur une bonne partie du back-office de PrestaShop 8, tel quel.

Et rien ne purge ce dossier tout seul : sans intervention manuelle, ce dossier ne fait que grossir.

## Solution

Je ne veux pas modifier le cœur de PrestaShop pour ça. Le plus simple est de nettoyer régulièrement le dossier de cache avec un cron journalier.

```sh
find var/cache/prod/twig -type f -mtime +7 -delete
```

Vider `var/cache/prod/twig` se fait sans conséquence : un template manquant se recompile à la volée, à la prochaine requête qui en a besoin. Vider le conteneur DI, à l'inverse, peut bloquer tout le back-office le temps d'une recompilation : c'est l'incident raconté dans [[14 minutes de cache-warmup sur EFS - quand un back-office PrestaShop devient injoignable|l'article précédent]].

C'est la leçon la moins intuitive de cette série : dans Symfony, « vider le cache » n'est pas une opération unique. C'est un ensemble de caches indépendants, avec des coûts de reconstruction et des rayons d'impact qui n'ont rien à voir les uns avec les autres. Les connaître séparément, c'est ce qui permet de cibler l'intervention au lieu de tout purger à l'aveugle.
