---
publish: true
created: 2026-09-14T23:10:00
modified: 2026-09-16T07:42
tags:
  - aws
  - shell
---

# ECS Exec en pratique : retrouver sa tâche, ouvrir la session, passer un script sans se battre avec le quoting

_Un guide de référence, indépendant du langage exécuté dans le container_

[ECS Exec](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html) permet d'ouvrir un canal de commande vers un container d'une tâche ECS en cours d'exécution, en s'appuyant sur AWS Systems Manager Session Manager comme transport. Pas de SSH, pas de port ouvert, pas d'agent bastion à maintenir, le canal passe par l'API AWS.

Ce billet rassemble la mécanique complète : retrouver les identifiants d'une tâche en partant de zéro, les prérequis IAM (souvent la partie qui bloque), et le piège du quoting imbriqué qui touche n'importe quel script un peu long, quel que soit le langage exécuté ensuite.

## Étape 0 : retrouver les identifiants de la tâche

Avant même de parler d'ECS Exec, encore faut-il savoir _quoi_ cibler : nom du cluster, ID de tâche, nom du container. Si on ne les a pas déjà sous la main (lien depuis la CI/CD, la console, un ticket), voici comment les retrouver en pur CLI, du plus général au plus précis :

```bash
# 1. Identification
aws login

# 2. Lister les clusters disponibles
aws ecs list-clusters

# 3. Lister les services d'un cluster (identifier le bon environnement,
#    ex. "pro-rct" pour une recette, "pro" pour la prod)
aws ecs list-services --cluster <nom-du-cluster>

# 4. Lister les tâches en cours pour ce service
aws ecs list-tasks --cluster <nom-du-cluster> --service-name <nom-du-service>
```

Cette dernière commande renvoie un ou plusieurs `taskArn`, de la forme :

```
arn:aws:ecs:eu-west-3:123456789012:task/mon-cluster/abcd1234ef...
```

L'ID de tâche à utiliser dans la suite est le dernier segment de cet ARN (`abcd1234ef...`). `aws ecs execute-command --task` accepte indifféremment l'ARN complet ou juste cet ID. Pas besoin de le découper à la main si on préfère coller l'ARN tel quel.

Avant de s'y connecter, autant confirmer qu'on cible la bonne tâche : statut, image déployée, noms des containers.

```bash
aws ecs describe-tasks --cluster <nom-du-cluster> --tasks <task-id-ou-arn>
```

Trois champs à repérer dans la sortie :

- `containers[].name` → le nom du container à passer à `--container`. Une tâche peut en contenir plusieurs (le container applicatif, plus un éventuel sidecar de sécurité ou de logging).
- `containers[].image` → confirme que c'est bien le build attendu (comparer tag ou digest, éventuellement recoupé avec le SHA du commit vu côté CI).
- `enableExecuteCommand` → voir la section suivante.

## Prérequis côté infra

À vérifier en lecture seule avant toute tentative de connexion.

D'abord, que les credentials locaux pointent bien sur le bon compte AWS, utile pour ne pas se tromper de compte si plusieurs profils sont configurés (staging vs prod) :

```bash
aws sts get-caller-identity --region <REGION>
```

Ensuite, qu'ECS Exec est bien activé sur la tâche ciblée :

```bash
aws ecs describe-tasks \
  --cluster <nom-du-cluster> \
  --tasks <task-id> \
  --query "tasks[0].enableExecuteCommand"
```

Si la réponse est `false`, ECS Exec n'est pas disponible sur cette tâche telle quelle. Deux options, aux implications différentes :

1. **Mettre à jour le service pour l'activer**, ce qui force un redéploiement, et donc redémarre les tâches. Pas anodin sur un service qui sert du trafic réel :

   ```bash
   aws ecs update-service \
     --cluster <nom-du-cluster> \
     --service <nom-du-service> \
     --enable-execute-command \
     --force-new-deployment
   ```

2. **L'activer en amont**, dans la définition de service ou au moment du déploiement (`--enable-execute-command` sur `create-service` / `deploy`), pour que le flag soit actif par défaut sur toutes les tâches futures. À privilégier si ce type de diagnostic doit se reproduire régulièrement, plutôt que de forcer un redéploiement à chaque fois qu'on en a besoin.

Le flag activé au niveau service ne suffit pas si l'agent managé n'a pas démarré sur la tâche elle-même. Dans la sortie complète de `describe-tasks` (sans le `--query` cette fois), chercher dans `containers[].managedAgents` une entrée :

```json
{"name": "ExecuteCommandAgent", "lastStatus": "RUNNING"}
```

Enfin côté IAM, deux couches distinctes, et les deux sont nécessaires :

- les credentials locaux (celles et ceux qui lancent la commande) doivent porter la permission `ecs:ExecuteCommand` sur le cluster ou la tâche.
- le [rôle de tâche](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html) ECS (task role, pas le rôle d'exécution, pas l'utilisateur qui se connecte) doit autoriser `ssmmessages:CreateControlChannel`, `CreateDataChannel`, `OpenControlChannel` et `OpenDataChannel`. C'est SSM Session Manager qui sert de transport sous le capot, donc c'est bien le rôle porté par la tâche en cours d'exécution qui doit l'autoriser, pas seulement le rôle IAM du côté client.

## Outil client requis : Session Manager Plugin

`aws ecs execute-command` route systématiquement via une session SSM Session Manager. Sans le plugin `session-manager-plugin` installé localement, la commande échoue avec un message explicite qui demande de l'installer.

```bash
# Windows (winget)
winget install --id Amazon.SessionManagerPlugin -e

# macOS (Homebrew)
brew install --cask session-manager-plugin

# Linux (Debian/Ubuntu) : télécharger le .deb officiel puis
sudo dpkg -i session-manager-plugin.deb
```

## Lancer une commande ponctuelle

```bash
aws ecs execute-command \
  --cluster <nom-du-cluster> \
  --task <task-id> \
  --container <nom-du-conteneur> \
  --region <REGION> \
  --interactive \
  --command "/bin/sh -lc 'pwd && whoami && php -v'"
```

`--interactive` est obligatoire : ECS Exec ne propose que des sessions interactives côté API, même lorsque la commande exécutée est un script qui se termine tout seul. Si la commande passée n'est pas elle-même un shell interactif, elle s'exécute puis la session se termine proprement. Pas besoin d'un vrai TTY côté client pour un diagnostic ponctuel.

## Le piège des quotes imbriquées, et la parade

La commande traverse trois couches de shell/quoting successives : le shell local qui invoque `aws ecs execute-command`, la chaîne passée à `--command`, puis `/bin/sh -c` à l'intérieur du container. Dès qu'on veut exécuter un script un peu long (plusieurs lignes, guillemets, conditions avec parenthèses), les quotes imbriquées deviennent vite ingérables.

Exemple concret rencontré : une commande contenant un `$(... || ...)` a échoué avec `Syntax error: "(" unexpected`, uniquement à cause de l'empilement des couches de quoting, pas d'une erreur de logique shell. Le script était syntaxiquement correct : c'est son passage à travers trois interprétations successives qui l'a cassé.

La parade est générale et indépendante du langage cible : encoder le script en base64 côté client, puis le décoder et le piper dans l'interpréteur souhaité côté container. Zéro problème d'échappement, quel que soit le contenu du script.

```bash
B64=$(base64 -w0 mon_script.sh)
aws ecs execute-command \
  --cluster <nom-du-cluster> --task <task-id> --container <nom-du-conteneur> --region <REGION> \
  --interactive \
  --command "/bin/sh -lc 'echo $B64 | base64 -d | sh'"
```

Remplacer `| sh` par `| php`, `| python3` ou n'importe quel autre interpréteur présent dans le container. La technique est indifférente à la cible. C'est ce qui la rend réutilisable bien au-delà d'un diagnostic PHP : un script Python de vérification, une requête SQL passée à un client en ligne de commande, un test Node, tout ce qui tient dans un fichier peut transiter de cette façon.

## Pourquoi c'est sûr, et où sont les limites

Faire tourner une commande dans un container de recette ou de prod fait peur, à raison. Quelques repères.

- Un script lancé en CLI démarre un process isolé, distinct du pool de workers qui sert le trafic réel (php-fpm, un worker Node, un thread Gunicorn selon la stack). Une commande ponctuelle en lecture seule n'affecte aucune requête en cours.
- ECS Exec exécute les commandes dans le container avec les privilèges `root`. C'est une raison supplémentaire de réserver la technique au diagnostic ponctuel et de restreindre précisément la permission `ecs:ExecuteCommand` à qui en a réellement besoin, un accès qui dépasse celui d'un utilisateur applicatif normal.
- Chaque session ECS Exec est tracée côté CloudTrail/SSM, ce qui est utile pour l'audit, mais rappelle aussi que ce n'est pas un canal fait pour de l'automatisation régulière (à scripter en boucle ou laisser ouvert).
- Une nuance à ne pas passer sous silence : ce niveau de sûreté suppose qu'ECS Exec est **déjà actif** sur la tâche. Si ce n'est pas le cas, l'activer via `update-service --force-new-deployment` force un redéploiement complet, ce n'est pas neutre sur un service qui sert du trafic. L'activation elle-même est l'étape à traiter avec prudence, à part, et pas dans l'urgence d'un diagnostic.

## Outils utilisés

- **AWS CLI v2** (`list-clusters`, `list-services`, `list-tasks`, `describe-tasks`, `execute-command`, `update-service`, `sts get-caller-identity`).
- **Session Manager Plugin** (`session-manager-plugin`), requis par `ecs execute-command`.
- **ECS Exec**, fonctionnalité ECS reposant sur AWS Systems Manager Session Manager.
- **`base64`**, pour transporter un script multi-lignes à travers plusieurs couches de shell sans souci de quoting.

Pour un exemple concret d'utilisation (vérifier un correctif de locale PHP directement dans une tâche ECS Fargate réelle), voir [[Le Dockerfile disait `fr_FR.UTF-8`. PHP voyait `C.UTF-8`|cet article]].
