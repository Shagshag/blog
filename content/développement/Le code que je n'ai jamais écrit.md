---
publish: true
title: Le code que je n'ai jamais écrit
description: Quand on dit que l'IA écrit 70 % ou 90 % du code, de quel code parle-t-on ? Un retour sur les frontières qui ont bien bougé depuis l'Amstrad CPC 464.
created: 2026-10-11T23:55:00
modified: 2026-10-16T09:45
tags:
  - ia
  - claude-code
  - retour-d-experience
socialImage: medias/2026/10/le-code-que-je-n-ai-jamais-ecrit.png
---

_Also available in [[The code I never wrote|English]]._

Au séminaire annuel de mon entreprise, mon N+1 a dit que l'IA écrivait environ 70 % du code. J'ai répondu que pour moi c'était plutôt 90 %. Les autres développeurs étaient d'accord avec moi. Après coup, ils m'ont fait remarquer qu'il n'était peut-être pas très prudent de le dire comme ça, et mon N+1 et le directeur ont paru surpris.

J'y ai repensé ensuite. Mon chiffre est une estimation issue de ma pratique de Claude Code, je n'ai rien mesuré. Mais surtout, nous ne parlions probablement pas de la même chose. Moi, je parlais du code qui se retrouve dans les fichiers à la fin. Lui parlait peut-être de la part du travail de développement que l'IA prend en charge.

Cette conversation m'a fait réaliser qu'un pourcentage de code écrit ne veut rien dire tant qu'on n'a pas dit où on place la frontière. Et celle-ci a déjà bougé plusieurs fois depuis que je programme.

## Tombé dans la marmite quand j'étais petit

Je ne suis pas assez vieux pour avoir connu les cartes perforées mais j'ai commencé fin des années 1980 sur un Amstrad CPC 464. On allumait la machine et on arrivait directement sur l'invite de commande. On pouvait taper `PRINT 1` et ça répondait. Programmer était une expérience normale, pas une activité à part.

Mon père avait des magazines d'informatique qui publiaient des programmes à recopier en BASIC. Je me souviens avoir passé des heures sur les listings de Cherry-Paint, un programme de dessin publié par [CPC Revue en 1986](https://cpcrulez.fr/GamesTest//applications_graphic-cherry-paint_CC.htm). D'après le site le code du programme était étalé sur cinq numéros et pour le premier il y avait environ 20 Ko de code à saisir (on était motivés). Une partie était du BASIC, et l'animation était du code machine donné sous forme de nombres hexadécimaux. Dans le deuxième épisode (CPC Revue n°6), l'auteur fournissait pour ça un chargeur en BASIC qui demandait huit nombres hexadécimaux par ligne, suivis d'une somme de test. Si le total calculé ne correspondait pas, il redemandait la ligne. Je ne comprenais pas ce que je recopiais, mais l'ordinateur pouvait me dire que je m'étais trompé.

![Capture d'écran de Cherry-Paint sur Amstrad CPC](medias/2026/10/cherry-paint.png)

![Revue CPC n°8 (1986) - CHERRY PAINT](medias/2026/10/magazine-cpc.jpg)

Le langage machine de l'Amstrad, ce sont les instructions binaires exécutées directement par le processeur. L'assembleur en est la représentation symbolique, plus lisible pour un humain. J'ai relu le début du livre _Le Langage Machine pour l'Amstrad CPC_. Dans la section « [Le premier programme machine](https://archive.org/details/07-le-langage-machine-pour-l-amstrad-cpc-1985acme/page/n15/mode/2up) », il met côte à côte un programme BASIC qui remplit la mémoire écran et le même travail en code machine. Le BASIC met environ une minute et le code machine environ un dixième de seconde. Cela fait un rapport de 600 d'après ses propres chiffres. L'argument du chapitre est qu'on a tout intérêt à apprendre le langage machine.

Peu de gens le faisaient, et je comprends pourquoi. Le BASIC n'était pas très évolué mais beaucoup plus simple à comprendre.

## Ce que j'ai arrêté d'écrire

Dans les années 1990, j'étais clairement un geek. Il y a eu [Visual Basic](https://fr.wikipedia.org/wiki/Visual_Basic) et [Delphi](https://fr.wikipedia.org/wiki/Delphi_\(langage\)). J'ai fait de l'assembleur sous Windows, du C++, un peu de shell sous [Mandrake](https://fr.wikipedia.org/wiki/Mandriva_Linux) puis de l'assembleur pour coder Pac-Man sur une [TI-89](https://fr.wikipedia.org/wiki/TI-89) en prépa (peut-on faire plus nerd ?). Au début des années 2000, j'ai découvert PHP 3, un langage interprété. Ensuite le JavaScript, la programmation objet, les frameworks, les patterns, Java, Node.

[![Electric Dreams 1984, Un film très geek et la première IA dont je me souvienne](medias/2026/10/electric-dreams.png)](https://fr.wikipedia.org/wiki/Electric_Dreams)

À chaque étape, il y a une partie du code que j'ai cessé d'écrire. Avec Delphi, je n'écrivais plus l'affichage des fenêtres. En PHP, je n'ai plus géré la mémoire à la main ni passé par une étape de compilation. Avec Symfony, je n'écris pas le noyau HTTP, le conteneur de services ni la couche d'accès à la base. Sur un projet de l'entreprise, j'ai compté les lignes de PHP, lignes vides et commentaires compris, sans les tests. Le dossier `src/` en contient 198 702 et `vendor/` 1 910 041 (dépendances de développement comprises, c'est donc un ordre de grandeur). Environ neuf lignes sur dix ne sont donc pas dans notre code. Et `src/` contient déjà du code écrit ou réécrit par l'IA, la part que j'ai écrite moi-même est donc encore plus petite. Je n'ai jamais écrit la plus grande partie du code qui s'exécute quand quelqu'un ouvre une page.

> [!note]
> C'est amusant car ces 90 % tombent presque exactement sur mon estimation du séminaire, mais ça ne veut rien dire, ils ne mesurent pas la même chose.

Personne ne conteste ça, parce que ça ne se voit pas. Si on avait posé la question « quelle part du code écrivez-vous vous-même » à un développeur Symfony il y a dix ans, la réponse aurait été faible aussi, avec une autre frontière.

Mon travail n'a d'ailleurs jamais été d'écrire du code. Le travail d'un chauffeur de taxi n'est pas de savoir lire un plan ni de brûler du carburant : il est de choisir le trajet, de gérer l'imprévu et de répondre de l'état du véhicule. Le mien est de comprendre le besoin derrière la demande, de décider comment (et parfois si) le construire, puis d'en assumer les conséquences longtemps après que le code a été écrit.

## Une couche de plus

Avec Claude Code, je décris ce que je veux en français. L'agent produit du PHP, que l'interpréteur PHP exécute, lui-même compilé en langage machine. Le langage naturel est devenu une couche de plus dans une pile qui en avait déjà beaucoup.

DHH le dit à sa façon. Dans [son keynote d'ouverture de Rails World 2026](https://youtu.be/vDjW_dRyKXY?t=2287), le 23 septembre, il affirme à environ 38 minutes que « English is a better programming language than Ruby », en précisant que c'est « a little more vague ». Il y explique que 37signals (l'entreprise derrière Basecamp et HEY) a arrêté d'écrire du code à la main. Sur un point, il va plus loin que moi : le code Rust que ses agents produisent, il dit ne pas le regarder, il juge le résultat de l'extérieur. Il raconte aussi pourquoi on avait choisi les abstractions : le temps d'un programmeur coûtait cher. Si une machine écrit le code de bas niveau, dit-il en substance, on peut avoir des programmes 30 à 100 fois plus rapides. C'est le même argument de vitesse que dans le livre de mon enfance.

Le langage naturel est aussi la première couche qui ne soit pas un langage formel. Une ligne de PHP a un sens et un seul. Une phrase en français peut en avoir plusieurs, et le même agent peut produire deux résultats différents à partir de la même phrase.

## Pourquoi je lis encore

À chaque couche, j'ai d'abord arrêté d'écrire le code qu'elle produisait, puis je n'ai plus eu besoin de le lire. Avec l'agent, j'en suis au premier stade : j'écris très peu de PHP, mais je le lis encore, et même plus qu'avant. Je ne sais pas si c'est transitoire. J'écris ceci en octobre 2026 et la pratique change vite.

Certains sont déjà plus loin. [Simon Willison](https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/) ne relit plus chaque ligne que ses agents écrivent, même pour de la production, et les traite comme une autre équipe dont il utilise le service sans lire le code. Il en est lui-même mal à l'aise. Une équipe humaine a une réputation à défendre et répond de son travail, alors que Claude Code n'a pas de réputation professionnelle. Il craint aussi qu'à force de succès il finisse par lui faire confiance au mauvais moment. Il s'appuie sur ses 25 ans d'expérience pour que ce pari reste raisonnable.

Je ne lis pas l'assembleur que produit le compilateur. Je ne lis pas non plus le code de Symfony en dehors des cas où quelque chose ne marche pas. Je fais confiance à ces couches parce qu'elles se comportent toujours pareil, que des millions de personnes les utilisent et qu'un problème finit par être corrigé pour tout le monde.

La sortie d'un agent est un travail fait pour moi, à cet instant, à partir d'une description qui peut être comprise de plusieurs façons. Le résultat peut être correct, ou correct avec une modification de trop, ou sans rapport avec ce que je voulais. Je ne peux pas encore le traiter comme je traite un compilateur. Si un jour je le fais, ce ne sera pas parce que c'est devenu à la mode, mais parce que je l'aurai vérifié assez souvent pour avoir confiance.

DHH a déjà tranché pour le Rust, il ne le lit pas. Je n'ai pas encore tranché pour le PHP.

## Retour aux 70 et 90 %

Mon N+1 comptait peut-être le travail, et moi le code. Les deux chiffres peuvent coexister, ils ne placent pas la frontière au même endroit. J'aurais pu donner le même genre de réponse dans les années 2000 en parlant du framework, avec un chiffre différent.

Ce qui me frappe, c'est qu'on continue de juger le travail d'un développeur à ce qu'il écrit, alors que la part qu'il écrit lui-même diminue à chaque étape depuis que je programme, sans que personne ne s'en inquiète. L'IA fait bouger la frontière beaucoup plus vite que d'habitude, et ça se voit. C'est ce qui a rendu la conversation du séminaire un peu bizarre. Que l'IA écrive 70 ou 90 % du code m'intéresse moins que de savoir à partir de quand une couche qu'on ne lit plus cesse d'être un pari.
