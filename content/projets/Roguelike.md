---
publish: true
created: 2026-04-06T09:05:00
modified: 2026-04-08T08:03
---

Je voudrais archiver ici mes réflexions et apprentissages durant le développement de ce projet.

## Description du projet

Faire un [roguelike](https://fr.wikipedia.org/wiki/Roguelike), un jeu d'exploration de donjon en [TypeScript](https://fr.wikipedia.org/wiki/TypeScript) avec plusieurs moteurs de rendu. Le moteur de jeu étant commun à tous les moteurs de rendu.

Mes buts sont :

- Apprendre plus TypeScript dont je ne connais que les bases
- Apprendre à utiliser node pour faire des interfaces CLI
- Apprendre à utiliser [Phaser](https://phaser.io/)
- M'amuser

### Moteur de jeu

Actuellement les fonctionnalités planifiées sont :

- Génération aléatoire de niveau : https://roguebasin.com/index.php/Basic\_BSP\_Dungeon\_generation
- Utilisation de niveaux prédéfinis
- Zones visibles, zones visités
- Points de vie
- Armure / Arme
- Inventaire
- Nourriture / items
- Ennemis
- Expérience
- PNJ
- Sources de lumière
- Sources de son

### Moteurs de rendu

Actuellement les moteurs de rendu planifiés sont :

- ASCII comme le rogue classique
  [![](https://upload.wikimedia.org/wikipedia/commons/1/17/Rogue_Screen_Shot_CAR.PNG)](https://commons.wikimedia.org/wiki/File:Rogue_Screen_Shot_CAR.PNG)
- Vue 2D plate
  [![](https://private-user-images.githubusercontent.com/38101123/244099660-6c2f4e46-c19e-44f2-8cc4-af33367596e2.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzU0NjI2MzYsIm5iZiI6MTc3NTQ2MjMzNiwicGF0aCI6Ii8zODEwMTEyMy8yNDQwOTk2NjAtNmMyZjRlNDYtYzE5ZS00NGYyLThjYzQtYWYzMzM2NzU5NmUyLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjA0MDYlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwNDA2VDA3NTg1NlomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTBhMTk5ODdiMjAyNjk2NTgyYjRmMzg2YWY0NzZkZTYwNTE4ODhjNzk4NTNkNWZmNzJjMzMwMTliNzFhNTkwYTcmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.xF-NyyUGo5hkz9Zaq14L8nbPLuPQ_Au96JKVMO-63yM)](https://github.com/benbenwsh/Hero-s-Rebirth)
- Vue isométrique à la Diablo https://phaser.io/examples/v3.85.0/tilemap/isometric/view/create-isometric-manually
  ![[medias/Pasted image 20260406095811.png]]
- Vue 3D à la [Lands of Lore: The Throne of Chaos](https://en.wikipedia.org/wiki/Lands_of_Lore:_The_Throne_of_Chaos)
  ![[medias/Pasted image 20260406095618.png]]
- Vue 3D à la DOOM https://phaser.io/news/2026/04/twopointfive-pseudo-3d-phaser-3-plugin
  ![[medias/Pasted image 20260406105936.png]]
- Vue 3D https://enable3d.io/
  [![](https://dungeon-crawlers.2gam.net/screenshot/172_2_arcmaze-3d-browser-based-mmo.jpg)](https://dungeon-crawlers.2gam.net/arcmaze)

## Journal

### 2026/04/06

Début du projet.
Pour commencer je vais développer en parallèle le moteur de rendu ASCII et le moteur de jeu mais ensuite il faudra les séparer en module avec des dépendances séparées.

#### Packages

Pour utiliser un package dans TypeScript via `import` il faut aussi installer le package `@types/[package]` :

```bash
npm install --save readline-sync
npm install --save-dev @types/readline-sync
```

`--save-dev` car on n'en a besoin que pour le développement. En production on a directement du JavaScript donc on utilise le package directement.

Ce qui permet de faire

```typescript
import * as readline from 'readline-sync';
```

Pour l'instant le moteur de rendu va utiliser [`node`](https://www.npmjs.com/package/node) pour l'accès au terminal, [`readline-sync`](https://www.npmjs.com/package/readline-sync) pour la gestion des touches, [`chalk`](https://www.npmjs.com/package/chalk) pour la couleur de texte. Donc `package.json` ressemble à

```json
{
	"dependencies": {
		"chalk": "^5.6.2",
		"readline-sync": "^1.4.10"
	},
	"devDependencies": {
		"@types/chalk": "^0.4.31",
		"@types/node": "^25.5.2",
		"@types/readline-sync": "^1.4.8"
	}
}
```

Edit: finalement `readline-sync` n'est pas utile. Je n'arrivais pas à faire fonctionner les flèches avec et `readline`, de base dans node, fonctionne bien.

Donc pour l'instant

- les deux moteurs sont bien séparés, il n'y a que les définitions des interfaces qui sont communes mais on verra cela plus tard.
- Le moteur de jeu créé un niveau vide, je regarderai la génération des salles plus tard mais il gère déjà les différentes tuiles et différentes entités
- Le moteur de rendu affiche le niveau, les entités capture les appuis sur les flèches, transmet au moteur de jeu qui gère les déplacements et demande un nouveau rendu.

### 2026/04/08

[Le mot "dungeon" est un faux ami qui signifie "cachot".](https://fr.wikipedia.org/wiki/Donjon_\(jeu_de_r%C3%B4le\)) Je pensais qu'il y avait une confusion entre un niveau du donjon, appelé "dungeon" et le donjon tout entier mais le monde du jeu est un ensemble de cachots, au sens large, que le joueur explore. C'est aussi pour cela que le joueur descend, il va dans des cachots de plus en plus profonds et dangereux.

https://github.com/halftheopposite/bsp-dungeon-generator créé des donjons très avancés. Idées à retenir :

- roomTemplate : les monstres et objets ne peuvent pas apparaitre dans n'importe quelle salle. Comme une plante au fond d'une cave ou un troll des caverne dans un chateau. ça permet de lister les possibilités d'une salle pour qu'elle reste logique.
- seed: pour sauvegarder un monde il suffit d'enregistrer la seed qui a été utilisée pour le générer.

## Ressources

- [Angbang](https://rephial.org/)
- https://www.roguebasin.com/index.php/Main\_Page
