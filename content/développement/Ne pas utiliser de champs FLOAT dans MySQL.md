---
publish: true
modified: 2025-06-17T19:56
tags:
  - SQL
---

En fait je ne sais pas pourquoi les float existent, c’est que des sources de bugs.

Il y a quelques années j’ai fait un champ float dans une table et aujourd’hui 1er bug parce que MySQL transforme 27.264957 en 27.265 dans ce champ et l’arrondi devient 27.27 au lieu de 27.26. Et la compta elle aime pas.

Donc la morale c’est : Pas de float, que des decimal

![](https://media.giphy.com/media/BNhhLecny6PO8/200.gif)
