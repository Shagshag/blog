---
publish: true
created: 2026-06-05T00:00:00
modified: 2026-10-04T00:00
tags:
  - obsidian
  - blog
  - quartz
---

En 2014 j'écrivais [[Dur de trouver un éditeur Markdown|un post sur ma recherche d'un éditeur Markdown]]. Je voulais quelque chose qui affiche un aperçu formaté, gère les images locales, et permette de naviguer entre les pages liées comme un wiki. Aucun éditeur ne faisait tout ça. J'avais fini par me contenter de Haroopad.

Douze ans plus tard j'ai exactement ce que je cherchais. Et c'est aussi ce qui publie ce blog.

## Comment j'ai découvert [Obsidian](https://obsidian.md)

Quand je travaillais comme développeur chez [50Factory](https://www.50factory.com/modeles-3d/), j'avais besoin de documenter un projet d'un outil pour configurer des guidons en 3D. J'utilisais [Dendron](https://dendron.so/), un plugin pour VSCode qui transforme l'éditeur en base de notes avec une structure hiérarchique. C'était bien intégré à mon environnement de développement, mais il fallait rester dans VSCode. Pas très pratique pour prendre des notes au vol.

C'est en regardant les vidéos de [morganeua](https://www.youtube.com/@morganeua) sur la prise de note que j'ai découvert Obsidian. Elle explique la méthode Zettelkasten — des notes atomiques, reliées entre elles, qui forment un réseau de connaissance. Je n'ai jamais vraiment réussi à appliquer le Zettelkasten comme il faut, mais Obsidian m'a convaincu en tant qu'outil.

C'est un éditeur Markdown local, qui stocke tout en fichiers texte brut, avec une navigation entre les notes via des liens wiki (`[[comme ça]]`), un graphe de liens, et suffisamment de plugins pour ne pas avoir envie d'aller voir ailleurs.

## La chaîne de publication

Ce blog est un vault Obsidian. Les notes que je décide de publier sont marquées avec `publish: true` dans leur [frontmatter](https://obsidian.md/help/properties).

Le plugin [quartz-syncer](https://github.com/saberzero1/quartz-syncer) lit ce marqueur et pousse les fichiers concernés vers un dépôt GitHub.

À chaque commit sur ce dépôt, [Sevalla](https://sevalla.com/static-site-hosting/) déclenche un build. Il génère le site statique (et l'héberge gratuitement) avec [Quartz v5](https://quartz.jzhao.xyz), un générateur pensé spécifiquement pour les vaults Obsidian. Il gère les wikilinks, le graphe de liens, la recherche, et le rendu Markdown tel qu'Obsidian le produit.

La grande différence de la v5, c'est que le moteur ne contient presque plus de fonctionnalités en dur. La recherche, l'explorateur, les backlinks, la table des matières, le rendu Obsidian… sont des plugins, chacun dans son propre dépôt GitHub (organisation `quartz-community`). Ils sont listés et configurés dans un fichier `quartz.config.yaml`, et un fichier `quartz.lock.json` épingle leurs versions, comme un lockfile. Au build, Sevalla installe ces plugins avant de générer le site.

En résumé :

```
Obsidian → quartz-syncer → GitHub → Sevalla → site statique
```

### Personnaliser sans toucher au moteur

Avec Quartz v4, j'avais modifié le code du moteur lui-même pour deux détails. Résultat : chaque mise à jour devenait pénible, il fallait refaire ou fusionner mes modifications.

Les deux détails en question :

- un titre de site contenant du HTML, `🐢<span class="desktop-only"> Shagshag</span>`, pour avoir un titre plus court sur petit écran (seule la tortue s'affiche en mobile) ;
- un emoji comme favicon, via un SVG en data URI (j'en parle dans [[Utiliser un emoji comme favicon]]).

En v5 je les ai refaits proprement sous forme de deux petits plugins, sans modifier une ligne de Quartz :

- [quartz-html-page-title](https://github.com/Shagshag/quartz-html-page-title) : un composant de titre qui affiche l'option `html` sans l'échapper. Il remplace le plugin `page-title`, que j'ai désactivé dans la config.
- [quartz-emoji-favicon](https://github.com/Shagshag/quartz-emoji-favicon) : un plugin qui ajoute dans le `<head>` un `<link rel="icon">` SVG construit à partir d'un emoji.

Ils s'installent comme les autres, avec une ligne `source: github:Shagshag/...` dans `quartz.config.yaml` :

```yaml
plugins:
  - source: github:Shagshag/quartz-html-page-title
    enabled: true
    options:
      html: '🐢<span class="desktop-only"> Shagshag</span>'
  - source: github:Shagshag/quartz-emoji-favicon
    enabled: true
    options:
      emoji: "🐢"
```

Petit point technique : ces plugins n'ont pas d'étape de compilation. Leur `dist/index.js` est écrit à la main et versionné dans leur dépôt.

## Ce que j'aime dans cette façon de faire

Tout est en Markdown local. Pas de base de données ni de PHP, pas d'interface d'administration, pas de WordPress qui se fait pirater à 3h du matin, très peu de fichiers. Si Sevalla disparaît demain, les fichiers sont là, sur mon disque, dans un format lisible par n'importe quel éditeur.

Le contrôle sur ce qui est publié est simple : un champ dans le frontmatter. Le reste reste privé dans le vault.

## Ce qui est moins parfait

Les images. Le sync des assets entre Obsidian et GitHub est le maillon fragile. Quartz-syncer s'en sort mais il faut faire attention à la façon dont Obsidian référence les fichiers joints.

Et la mise en page standardisée du site final, c'est pas fun. Ça reste un chantier, mais avec les plugins et le fichier de configuration, la personnalisation passe désormais par la config et de petits plugins plutôt que par le code du moteur.
