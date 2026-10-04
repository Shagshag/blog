---
publish: true
title: Corriger les URLs propres de Quartz sur Sevalla
created: 2026-09-11T18:00:00
modified: 2026-10-04T17:00
tags:
  - quartz
  - retour-d-experience
---

Quartz génère ses liens internes sans extension : un lien vers cette page pointe vers `/développement/corriger-les-urls-propres-de-quartz-sur-sevalla`, jamais vers la même adresse en `.html`. C'est un choix assumé du projet (le type `FullSlug` est documenté "no file extension") qui laisse à l'hébergeur le soin de faire correspondre `/xxx` au fichier `xxx.html` réellement généré.

Sur [Sevalla](https://sevalla.com/static-site-hosting/), qui héberge ce [[Comment ce blog est publié|blog]], sans rien configurer ça donne une 404 sur le moindre lien interne cliqué. Le fichier existe, mais pas l'URL demandée.

## Pretty URLs

Sevalla propose un toggle "Pretty URLs" dans Static Site → Settings → Redirects, prévu justement pour ce cas. Je l'ai activé, les 404 ont disparu.

Ça a tenu des mois, jusqu'à une mise à jour de Quartz (le cœur et les 44 plugins communautaires que j'utilise). Après avoir poussé les changements, plus aucun style ni script sur le site, sauf sur la page d'accueil.

Rien ne le signalait dans l'interface : Sevalla sert sa page 404 personnalisée avec un statut 200, donc l'échec des CSS et JS ne se voit qu'en ouvrant l'onglet réseau du navigateur.

En creusant : "Pretty URLs" ne fait pas une réécriture interne, il fait une vraie redirection HTTP vers une URL avec un slash final (`/développement/mon-article/` au lieu de `/développement/mon-article`). Or Quartz calcule ses chemins CSS/JS en relatif, en supposant que la page est un fichier : `../component-styles.css` remonte à la racine depuis là. Avec le slash final, le navigateur traite l'URL comme un dossier, et `../` remonte d'un cran de trop.

Le cache a bien failli me faire tourner en rond pendant le diagnostic : navigateur et Cloudflare, qui est devant Sevalla, cachent les redirections 3xx de façon agressive. Une fois la correction faite côté serveur, plusieurs rechargements donnaient encore l'impression que rien n'avait changé, alors que `curl` confirmait que si.

## Ce qui marche

Désactiver "Pretty URLs" sur Sevalla, et ajouter un fichier `_redirects` (le format Netlify, que Sevalla supporte aussi) à la racine de `public/` :

```
/* /:splat.html 200
```

Le `200` fait toute la différence avec une redirection : c'est une réécriture côté serveur, pas un renvoi au navigateur. Le contenu de `xxx.html` est servi directement à l'URL `xxx`, qui ne change jamais, donc les chemins relatifs de Quartz restent corrects. L'équivalent d'un `try_files` nginx, ou du `cleanUrls: true` de Vercel.

Je ne maintiens pas ce fichier à la main : il est généré à chaque build par le plugin [redirects-file](https://github.com/Shagshag/redirects-file). Il s'installe comme les autres plugins, avec une ligne `source: github:Shagshag/redirects-file` dans `quartz.config.yaml`, sans modifier le moteur.

Le plugin fait trois choses :

- il émet la règle `/* /:splat.html 200` (option `catchAllRewrite`, activée par défaut) ;
- il accepte des redirections explicites dans la config (option `redirects`, une liste de `from` / `to`, avec un statut 301 par défaut). Je m'en sers pour les anciennes URLs dont le slug a changé (accents, ponctuation nettoyés). Les URLs sont encodées comme un navigateur les envoie, car Sevalla compare au chemin encodé ;
- avec l'option `aliases: true`, il génère aussi un 301 serveur pour chaque entrée `aliases` du frontmatter d'une note, vers cette note.

```yaml
plugins:
  - source: github:Shagshag/redirects-file
    enabled: true
    options:
      aliases: true
      redirects:
        - from: "culture/la-célébrité"
          to: "culture/la-celebrite"
```

Pour les alias, le plugin communautaire `alias-redirects` (que j'utilise aussi) gère déjà les `aliases`, mais avec des pages HTML en meta-refresh, donc une redirection côté navigateur. Avec `redirects-file`, j'obtiens en plus de vrais 301 côté serveur. Les deux peuvent cohabiter.

La même mise à jour du cœur Quartz a aussi changé les liens CSS/JS générés, de relatifs à absolus (`/component-styles.css`). Le site est donc un peu moins fragile qu'avant sur ce genre de souci de profondeur d'URL, même si `_redirects` reste nécessaire pour les pages elles-mêmes.
