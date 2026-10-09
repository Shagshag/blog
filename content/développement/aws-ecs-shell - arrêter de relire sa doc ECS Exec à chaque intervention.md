---
publish: true
title: "aws-ecs-shell : arrêter de relire sa doc ECS Exec à chaque intervention"
created: 2026-10-09T18:00:00
modified: 2026-10-09T18:00:00
tags:
  - aws
  - ecs
  - shell
  - bash
---

_Also available in [[aws-ecs-shell - stop rereading the ECS Exec docs before every intervention|English]]._

Il y a quelques semaines, un `locale` mal initialisé m'a obligé à aller regarder dans une tâche ECS en recette. Ça a donné [[Le Dockerfile disait `fr_FR.UTF-8`. PHP voyait `C.UTF-8`|un article sur iconv]] et [[ECS Exec en pratique - retrouver sa tâche, ouvrir la session, passer un script sans se battre avec le quoting|un guide sur ECS Exec]]. Plus tard, un back-office PrestaShop est devenu injoignable et j'ai dû de nouveau passer par ECS Exec, cette fois en production, pour regarder la configuration réelle de l'instance, les process en cours et leur durée d'exécution (c'est l'objet de [[14 minutes de cache-warmup sur EFS - quand un back-office PrestaShop devient injoignable|cet article]]). La bonne solution y était d'exécuter une commande de cache directement sur l'instance. Le script dont je parle ici n'existait pas encore à ce moment-là, et il n'a servi ni au diagnostic ni à la correction. Il est venu après.

## La séquence

Dans les deux cas, j'ai dû relire ma propre documentation avant de pouvoir ouvrir le shell. Pour ouvrir une session avec ECS Exec, il faut retrouver le cluster, le service, l'identifiant de la tâche et le nom du conteneur. Quatre `aws ecs ...` à la suite, en recopiant la valeur de la sortie précédente. Le guide détaille tout ça, je n'y reviens pas.

On n'intervient pas souvent sur une instance, et il vaut mieux que ça reste rare. Donc à chaque fois, je ne me souviens plus de la séquence exacte. Et ça tombe souvent au moment où on est pressé, avec la tête déjà occupée par le problème. En production, jongler entre des commandes `aws` qu'on ne maîtrise plus par coeur ajoute du stress dont on se passerait. L'identifiant d'une tâche change en plus à chaque déploiement, aucune commande ne se rejoue telle quelle d'une fois sur l'autre.

J'ai donc écrit [aws-ecs-shell](https://github.com/Shagshag/aws-ecs-shell), un script Bash d'environ 250 lignes, écrit avec l'aide de l'IA comme à peu près tout ce que je fais en ce moment.

## Ce que ça donne

Sans argument, le script propose des menus numérotés : clusters, puis services, puis tâches en cours, puis conteneurs.

```
$ ./aws-ecs-shell.sh
1) alpha
2) beta
Cluster (number, Ctrl-D to cancel) > 2
Service: web
1) 7f3c0e1a9b…  (started 2026-10-09T10:00:00Z)
2) c41d88b2e0…  (started 2026-10-08T09:00:00Z)
Task (number, Ctrl-D to cancel) > 1
Container: app
To skip the menus next time: ./aws-ecs-shell.sh --cluster beta --service web --container app
Connecting to ECS task 7f3c0e1a9b… (cluster: beta, container: app)...
```

Chaque menu est sauté si la valeur est passée en option (`--cluster`, `--service`, `--task`, `--container`, `--region`, `--profile`) ou en variable d'environnement. Un menu à une seule entrée est choisi tout seul, ce qui est le cas le plus courant pour le service et le conteneur.

## Trois choix qui me semblent utiles

**La commande de rejeu.** Avant de se connecter, le script affiche la ligne qui évite les menus la prochaine fois (`To skip the menus next time`). Je n'ai pas à me souvenir des noms, je les copie. L'identifiant de tâche en est retiré quand le service n'avait qu'une seule tâche, puisqu'il ne vaudrait plus rien au déploiement suivant. Un service avec plusieurs tâches garde son identifiant dans la commande.

**Le mode sans terminal.** Quand l'entrée standard n'est pas un terminal (cron, pipe, autre script), il n'y a pas de menu. Le script exige alors `--cluster`, `--service` ou `--task`, et `--container` si la tâche en a plusieurs, et il liste les conteneurs disponibles dans le message d'erreur. Il ne reste jamais bloqué à attendre une saisie.

**Une seule session, avec un vrai TTY.** Le script finit par un `exec aws ecs execute-command --interactive`. Il n'y a donc qu'une session SSM persistante : `cd` et `export` tiennent d'une commande à l'autre, `vim`, `top` et Ctrl-C se comportent normalement.

Le shell lancé est `bash` s'il existe dans l'image, `sh` sinon. `execute-command` découpe `--command` sur les espaces et exécute le premier mot sans passer par un shell. Un `if` ne peut donc pas y passer tel quel. Le test est encodé en base64 et décodé côté conteneur, avec `${IFS}` à la place des espaces pour que le tout reste un seul mot. C'est la même idée que dans le guide pour passer un script, réduite à une ligne.

## Le reste

Le script vérifie au départ que `aws` et `session-manager-plugin` sont dans le `PATH`, que les identifiants fonctionnent, puis que la tâche existe et que ECS Exec est activé dessus. Chaque échec produit un message qui dit quoi corriger, plutôt qu'une erreur brute de l'API.

Deux détails viennent du fait que je travaille sous Windows. Sous Git Bash, `aws.exe` termine ses lignes par un CRLF, et un `\r` dans un ARN suffit à ce qu'ECS le rejette avec `Unexpected number of separators`. Le script retire ces `\r`. Il reste aussi compatible avec Bash 3.2, celui de macOS.

Le script ne lit que l'API ECS pour construire ses menus et ne modifie rien côté AWS. Mais une fois dans le shell, tout ce qu'on tape s'exécute dans l'environnement auquel on s'est connecté. Il ne rend pas l'intervention moins risquée, il la rend plus rapide à démarrer.

Le code est sous licence MIT : [github.com/Shagshag/aws-ecs-shell](https://github.com/Shagshag/aws-ecs-shell). Les prérequis (AWS CLI, plugin Session Manager, tâche lancée avec `enableExecuteCommand`, rôle de tâche avec `ssmmessages:*`) sont dans le README.
