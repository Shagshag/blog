---
publish: true
title: Un jardin solarpunk pour son profil GitHub, généré chaque jour à partir de ses contributions
created: 2026-10-08T23:58:00
modified: 2026-10-09T00:05
tags:
  - github
  - python
  - svg
  - solarpunk
---

_solarpunk : des couleurs douces, la nature et une technologie sobre, le contraire du néon sombre du cyberpunk_

_Also available in [[A solarpunk garden for your GitHub profile, generated daily from your contributions|English]]._

J'ai transformé mon graphe de contributions GitHub en jardin isométrique. Une parcelle par jour, une plante qui grandit avec le nombre de contributions, des saisons qui suivent le calendrier et un petit jardinier qui se promène autour de la parcelle du jour. C'est un simple SVG avec des animations CSS et SMIL, régénéré chaque jour par une GitHub Action. Uniquement la bibliothèque standard de Python, aucune dépendance, licence MIT : [Shagshag/garden-graph](https://github.com/Shagshag/garden-graph).

J'ai construit ça avec Claude Code. J'ai décidé de l'apparence du jardin et j'ai jugé chaque rendu à l'œil. L'assistant a écrit l'essentiel du code et lancé les vérifications en ligne de commande.

![La vue de l'année, version claire en haut à droite et version sombre en bas à gauche](medias/2026/10/garden-year-split.gif)

> Note : le SVG animé est visible dans le [README du dépôt](https://github.com/Shagshag/garden-graph/blob/main/README.md), et les fichiers bruts sont dans le [dossier assets](https://github.com/Shagshag/garden-graph/tree/main/assets).

Cet article montre comment mettre le même jardin sur son propre profil, et comment l'adapter à la région où l'on vit.

### 🌱 D'où vient l'idée

Je suis parti de l'article de Giorgi Kobaidze, [I turned my GitHub profile into a cyberpunk console, with a city built from my contributions](https://dev.to/georgekobaidze/i-turned-my-github-profile-into-a-cyberpunk-console-with-a-city-built-from-my-contributions-h4c). J'en ai repris la forme générale. Une GitHub Action quotidienne appelle l'API GraphQL, un script Python écrit un SVG, la vue isométrique est dessinée de l'arrière vers l'avant (pas de moteur 3D), les animations sont du CSS dans le SVG, et le workflow ne committe que si des fichiers ont changé. L'article expliquait aussi que `contributionsCollection` ne couvre qu'un an par requête (voir la [référence GraphQL](https://docs.github.com/en/graphql/reference/users)), et que pour remonter plus loin il faut un champ aliasé par année. Je m'y prends un peu différemment, voir l'annexe.

Cette inspiration était cyberpunk : une ville, de la nuit, du néon. Je voulais quelque chose de plus frais et de plus agréable. Je fais aussi un jeu de restauration solarpunk. Les couleurs sont donc douces et proches de la nature, et les éoliennes rappellent le côté énergie douce du thème.

### 🌳 Ce que contient le jardin

Chaque jour est une parcelle. La plante qui y pousse dépend de l'activité du jour par rapport aux autres jours actifs (par quartiles) : de la terre nue s'il n'y a aucune contribution, puis une pousse, une fleur, un arbre, et pour le quart le plus actif une éolienne avec un panneau solaire. Les jours à venir sont en terre battue. La saison suit la date, et chaque fichier existe en version claire et en version sombre.

Trois vues sont générées : l'année en cours repliée en deux semestres (de grandes parcelles, faciles à lire), une vue d'ensemble des cinq dernières années, et une vue pensée pour les téléphones.

![La vue sur cinq ans, version claire en haut à droite et version sombre en bas à gauche](medias/2026/10/garden-split.gif)

![La vue mobile, version claire en haut à droite et version sombre en bas à gauche](medias/2026/10/mobile-garden-year-split.gif)

### 🪏 Installer le jardin sur son profil

1. Récupérer les fichiers dans son propre dépôt : soit en le forkant, soit en créant `<login>/<login>` (le dépôt que GitHub utilise pour le README du profil) et en y copiant les fichiers. Activer GitHub Actions.
2. Ouvrir `.github/workflows/garden.yml` et choisir son climat et sa langue :

```yaml
env:
  GARDEN_CLIMATE: temperate-north  # voir le tableau plus bas
  GARDEN_LANG: fr                  # fr (par défaut), en, ja ou hi
  GITHUB_TOKEN: ${{ secrets.GH_STATS_TOKEN || secrets.GITHUB_TOKEN }}
```

3. Lancer une fois le workflow **Update garden** depuis l'onglet Actions.

Ensuite, il tourne chaque jour à 05:17 UTC (`17 5 * * *`) et ne committe que si quelque chose a changé. Ça fait un commit par jour, et une exécution dure environ 15 secondes.

Par défaut, le jardin est dessiné pour le propriétaire du dépôt : un fork affiche donc le jardin de son propriétaire, pas le mien. On ne renseigne `GITHUB_LOGIN` que pour afficher les contributions de quelqu'un d'autre. Pour compter aussi les contributions privées, il faut ajouter un secret `GH_STATS_TOKEN` (un token avec `read:user`) et activer « Private contributions » dans les réglages du profil. `GARDEN_YEARS` (5 par défaut) règle le nombre d'années de la vue d'ensemble.

### 🏡 Adapter le jardin à sa région

Un graphe de contributions ne connaît pas les saisons, et la plupart des gens n'en ont pas quatre bien nettes. La première version était écrite pour l'hémisphère nord, donc elle était fausse en Australie. Un décalage de six mois a réglé ça, mais il ne couvrait que les climats tempérés. Je suis donc passé à un réglage `GARDEN_CLIMATE`.

Pour choisir les climats à proposer, j'ai regardé où se trouvent les comptes GitHub. Dans le [billet officiel Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/), les États-Unis arrivent en tête avec 28 millions de développeurs, l'Inde est deuxième avec 21,9 millions et le Brésil quatrième avec 6,89 millions. La Chine fait aussi partie des dix premiers. Ça donne sept climats :

| `GARDEN_CLIMATE`  | Saisons                                                                  | Pour                                                          |
| ----------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `temperate-north` | printemps, été, automne, hiver                                           | Amérique du Nord, Europe                                      |
| `temperate-south` | les mêmes, décalées de six mois                                          | sud de l'Australie, Nouvelle-Zélande, Argentine, Afrique du Sud |
| `monsoon`         | fraîche, chaude, mousson, après-mousson                                  | Inde, Bangladesh, Sri Lanka, Népal                            |
| `tropical-south`  | pluies (nov. à avril), sèche (mai à oct.)                                | Brésil central, Indonésie, Afrique australe                   |
| `tropical-north`  | pluies (mai à oct.), sèche (nov. à avril)                                | Sahel, Amérique centrale, Asie du Sud-Est continentale        |
| `china-southeast` | hiver doux, pluies de printemps, été humide et typhons, automne clair    | Guangdong, Fujian, Hong Kong                                  |
| `japan`           | sakura, printemps, tsuyu, été, automne, hiver                            | Honshu                                                        |

Les mois sont des moyennes. Une région précise (la côte est de l'Inde, le Kerala) peut avoir ses pluies à d'autres dates, donc un climat reste une approximation. Au Japon, un mois peut être coupé en deux, parce que le tsuyu dure jusqu'à la mi-juillet.

Si sa région n'est pas dans la liste, on ajoute un climat dans `render.py` : une entrée dans `CLIMATES` (la saison de chaque mois et l'ordre de la légende) et une entrée dans `PALETTE` pour chaque nouvelle saison (couleur du sol, des feuilles et des fleurs, fleurs ou fruits sur les arbres, flaques, neige). Par exemple, les tropiques à deux saisons de l'hémisphère nord s'écrivent :

```python
"tropical-north": (_months(wet="5 6 7 8 9 10", dry="11 12 1 2 3 4"), ("wet", "dry")),
```

Le code de dessin ne teste pas les noms de saison, il lit la palette. Rien d'autre n'a donc besoin de changer.

![Le climat de la mousson](medias/2026/10/climate-monsoon-light.png)
![Le climat du Japon](medias/2026/10/climate-japan-light.png)

Le climat de la mousson, puis celui du Japon.

Les langues fonctionnent de la même façon. `GARDEN_LANG` accepte `fr`, `en`, `ja` ou `hi`. Les textes de `i18n.py` sont des modèles de phrases complets avec des zones de remplacement (`{login}`, `{total}`, `{first}`, `{last}`), pas des mots collés les uns aux autres, parce que l'ordre des mots et la ponctuation changent d'une langue à l'autre. Pour ajouter une langue, on copie une entrée de `STRINGS` et on la traduit. Les nombres suivent l'usage local, y compris le groupement indien (12,34,567).

### 🥗 L'intégrer dans son README

Dans le README du profil, la vue de l'année s'intègre avec `<picture>`, qui sert une image claire ou une image sombre. Le basculement avec `<source media="(prefers-color-scheme: dark)">` vient de l'article de Kera Cudmore, [GitHub README images based on prefers-color-scheme](https://dev.to/keracudmore/github-readme-images-based-on-prefers-color-scheme-5cp8), et de la section « Adding an image to suit your visitors » du [Quickstart for writing on GitHub](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/quickstart-for-writing-on-github).

```html
<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="assets/garden-mobile-dark.svg">
  <source media="(max-width: 600px)" srcset="assets/garden-mobile-light.svg">
  <source media="(prefers-color-scheme: dark)" srcset="assets/garden-year-dark.svg">
  <img alt="Le jardin de mes contributions" src="assets/garden-year-light.svg">
</picture>
```

L'ordre des sources compte : la première qui correspond l'emporte.

### 📱 Trois vues, trois tailles

La partie sur les téléphones est de moi. Aucune des deux sources ci-dessus n'en parle. Sur GitHub, l'image de 1000 px s'affiche un peu plus petite, et les parcelles de la vue sur cinq ans font moins de 20 px de large, ce qui est pénible à lire pour un seul jour. C'est pour ça que la vue de l'année existe, repliée en deux semestres pour que les parcelles soient environ deux fois plus grandes.

Sur un téléphone, c'est pire : l'image est réduite à environ un tiers de sa taille et le titre tombe à 8 px environ. La troisième vue, `garden-mobile-*.svg`, a un canevas étroit, un texte plus gros et la légende sous le jardin. Les deux premières lignes `<source>` ci-dessus la choisissent avec une media query `max-width` combinée au thème de couleur.

Si l'on intègre aussi la vue sur cinq ans, elle est trop fine pour un téléphone. Une `<img>` ne peut pas être masquée, donc sur un téléphone le dépôt la remplace par `blank.svg`, un SVG d'un pixel. C'est un contournement. Le README du dépôt le fait avec un second `<picture>` :

```html
<picture>
  <source media="(max-width: 600px)" srcset="assets/blank.svg">
  <source media="(prefers-color-scheme: dark)" srcset="assets/garden-dark.svg">
  <img alt="Le même jardin sur les cinq dernières années" src="assets/garden-light.svg">
</picture>
```

### 🐛 Les problèmes rencontrés

Deux choses ont cassé en route, et une seule était un vrai bug.

Les éoliennes tournaient d'abord avec une animation CSS, qui ne marchait plus dès que les plantes étaient mises à l'échelle. Elles utilisent maintenant l'animation propre à SVG. Une capture d'écran est figée, donc le mouvement a été vérifié en avançant le temps virtuel d'un navigateur headless.

Le jardinier se promène sur quelques parcelles autour de celle du jour. La première version parcourait une distance fixe. En début et en fin d'année, il sortait donc du terrain, puisque la première et la dernière semaine peuvent être incomplètes.

![Coyote qui tombe](medias/2026/10/wile-e-coyote-3018138172.gif)

Son trajet est maintenant limité aux parcelles qui existent sur sa rangée, et sa durée suit la distance parcourue pour que la vitesse reste la même. Il a été vérifié le 1er janvier, le 10 janvier, le 20 décembre et le 31 décembre.

### 🐞 Projets voisins

Je ne suis pas le premier à dessiner des contributions sous forme de jardin. [a104437ana/sakura-garden](https://github.com/a104437ana/sakura-garden) les dessine en fleurs dans un SVG pour un README, et [qrstajalli/BranchOut](https://github.com/qrstajalli/BranchOut) transforme la dernière année en jardin en pixel art. garden-graph se distingue par sa vue isométrique, ses sept climats, ses quatre langues et sa vue pour téléphone.

### 🐌 Limites et état du projet

- Les textes japonais et hindi n'ont pas été relus par un locuteur natif.
- Les polices ne sont pas embarquées dans le SVG : le japonais et l'hindi demandent une police adaptée sur la machine de celui qui regarde.
- J'ai testé sur github.com (la page du dépôt et la page de mon profil), pas dans l'application mobile de GitHub, ni sur d'autres sites.
- Sur un téléphone, la combinaison mobile et sombre suit le thème du système, pas forcément celui choisi dans GitHub.
- Les parcelles restent petites sur un téléphone, parce que la largeur est fixe.
- Les mois de chaque climat sont des moyennes : un climat est une approximation par région.

Reste à faire : faire relire les textes japonais et hindi, embarquer les polices et tester dans l'application mobile de GitHub.

### 🧮 Annexe : récupérer plusieurs années en une requête

L'article de Giorgi récupère la liste des années actives avec `contributionYears`, puis construit un champ aliasé par année. garden-graph fait pareil avec une différence : le nombre d'années est fixe (`GARDEN_YEARS`, 5 par défaut), il n'y a donc pas de première requête. `fetch.py` part de l'année en cours et remonte dans le temps, puis envoie une seule requête :

```python
fields = "".join(
    f'y{y}: contributionsCollection(from: "{y}-01-01T00:00:00Z", to: "{y}-12-31T23:59:59Z") {{'
    "contributionCalendar { weeks { contributionDays { date contributionCount } } } } "
    for y in years
)
```

Chaque champ demande une année calendaire, du 1er janvier au 31 décembre, et reste donc sous la limite d'un an. L'API refuse une plage plus longue.

Un calendrier GitHub est fait de semaines entières. La première et la dernière semaine d'une année peuvent contenir des jours de l'année précédente ou suivante, et une même date peut donc revenir dans deux champs. Le script ne garde une date que si elle appartient à l'année de son champ et qu'elle n'est pas dans le futur, puis la range par date :

```python
for y in years:
    for week in user[f"y{y}"]["contributionCalendar"]["weeks"]:
        for d in week["contributionDays"]:
            if d["date"].startswith(str(y)) and d["date"] <= date.today().isoformat():
                counts[d["date"]] = d["contributionCount"]
```

Le résultat est écrit dans `data/contributions.json`. Si l'API ne répond pas, le script affiche un message et garde le fichier précédent : le jardin est alors dessiné avec les dernières données disponibles.

### 🌻 Sources

- Giorgi Kobaidze, [I turned my GitHub profile into a cyberpunk console, with a city built from my contributions](https://dev.to/georgekobaidze/i-turned-my-github-profile-into-a-cyberpunk-console-with-a-city-built-from-my-contributions-h4c)
- Kera Cudmore, [GitHub README images based on prefers-color-scheme](https://dev.to/keracudmore/github-readme-images-based-on-prefers-color-scheme-5cp8) (juillet 2025)
- GitHub Docs, [Quickstart for writing on GitHub](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/quickstart-for-writing-on-github)
- GitHub Docs, [GraphQL reference, Users](https://docs.github.com/en/graphql/reference/users) (`contributionsCollection`)
- GitHub, [Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)
- [a104437ana/sakura-garden](https://github.com/a104437ana/sakura-garden), [qrstajalli/BranchOut](https://github.com/qrstajalli/BranchOut)
- [Shagshag/garden-graph](https://github.com/Shagshag/garden-graph) (MIT)
