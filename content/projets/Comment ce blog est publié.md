---
publish: true
modified: 2026-06-05T23:40
tags:
  - obsidian
  - blog
  - quartz
---

En 2014 j'écrivais [[Dur de trouver un éditeur Markdown|un post sur ma recherche d'un éditeur Markdown]]. Je voulais quelque chose qui affiche un aperçu formaté, gère les images locales, et permette de naviguer entre les pages liées comme un wiki. Aucun éditeur ne faisait tout ça. J'avais fini par me contenter de Haroopad.

Douze ans plus tard j'ai exactement ce que je cherchais. Et c'est aussi ce qui publie ce blog.

## Comment j'ai découvert [Obsidian](https://obsidian.md)

Quand je travaillais comme développeur chez [50Factory](https://www.50factory.com/modeles-3d/), j'avais besoin de documenter un projet d'[un outil pour configurer des guidons en 3D](medias/2026/06/50factory-3d.gif). J'utilisais [Dendron](https://dendron.so/), un plugin pour VSCode qui transforme l'éditeur en base de notes avec une structure hiérarchique. C'était bien intégré à mon environnement de développement, mais il fallait rester dans VSCode. Pas très pratique pour prendre des notes au vol.

C'est en regardant les vidéos de [morganeua](https://www.youtube.com/@morganeua) sur la prise de note que j'ai découvert Obsidian. Elle explique la méthode Zettelkasten — des notes atomiques, reliées entre elles, qui forment un réseau de connaissance. Je n'ai jamais vraiment réussi à appliquer le Zettelkasten comme il faut, mais Obsidian m'a convaincu en tant qu'outil.

C'est un éditeur Markdown local, qui stocke tout en fichiers texte brut, avec une navigation entre les notes via des liens wiki (`[[comme ça]]`), un graphe de liens, et suffisamment de plugins pour ne pas avoir envie d'aller voir ailleurs.

## La chaîne de publication

Ce blog est un vault Obsidian. Les notes que je décide de publier sont marquées avec `publish: true` dans leur [frontmatter](https://obsidian.md/help/properties).

Le plugin [quartz-syncer](https://github.com/saberzero1/quartz-syncer) lit ce marqueur et pousse les fichiers concernés vers un dépôt GitHub.

À chaque commit sur ce dépôt, [Sevalla](https://sevalla.com/static-site-hosting/) déclenche un build. Il génère le site statique (et l'héberge gratuitement) avec [Quartz v4](https://quartz.jzhao.xyz), un générateur pensé spécifiquement pour les vaults Obsidian. Il gère les wikilinks, le graphe de liens, la recherche, et le rendu Markdown tel qu'Obsidian le produit.

En résumé :

```
Obsidian → quartz-syncer → GitHub → Sevalla → site statique
```

## Ce que j'aime dans cette façon de faire

Tout est en Markdown local. Pas de base de données ni de PHP, pas d'interface d'administration, pas de WordPress qui se fait pirater à 3h du matin, très peu de fichiers. Si Sevalla disparaît demain, les fichiers sont là, sur mon disque, dans un format lisible par n'importe quel éditeur.

Le contrôle sur ce qui est publié est simple : un champ dans le frontmatter. Le reste reste privé dans le vault.

## Ce qui est moins parfait

Les images. Le sync des assets entre Obsidian et GitHub est le maillon fragile. Quartz-syncer s'en sort mais il faut faire attention à la façon dont Obsidian référence les fichiers joints.

Et la mise en page standardisée du site final, c'est pas fun. Il faut que je regarde la documentation de quartz.
