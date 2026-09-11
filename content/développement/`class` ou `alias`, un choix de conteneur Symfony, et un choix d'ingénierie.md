---
publish: true
created: 2026-09-10T17:01:00
modified: 2026-09-11T17:11
tags:
  - symfony
  - testing
  - php
---

# `class:` ou `alias:`, un choix de conteneur Symfony, et un choix d'ingénierie

_Pourquoi un fake S3 jetable peut être préférable à MinIO_

Deux décisions se sont posées en recettant un pipeline d'import qui écrit sur S3, sans le moindre accès AWS en local.

La première est une question technique : pourquoi `alias:` fonctionne alors que `class:` échoue dans un override `when@dev` ?

La seconde est une décision d'architecture : pourquoi choisir un double maison jetable plutôt que [MinIO](https://addons.ddev.com/addons/ddev/ddev-minio) ?

Le S3 n'est finalement qu'un prétexte. Les deux réponses se généralisent à bien d'autres situations.

## Le contexte

Une plateforme Symfony 5.3 importe des fichiers d'achats déposés par une centrale. Les lignes qui référencent une entité encore inconnue sont mises de côté dans un fichier de rejets **sur S3** ; un écran d'administration permet ensuite de résoudre l'entité, puis de **réimporter** ces lignes.

Le service qui parle à S3, `AwsService`, tire ses credentials du rôle de tâche ECS (`CredentialProvider::ecsCredentials()`), donc d'une infrastructure AWS uniquement disponible en production. Le nom du bucket vient quant à lui d'une ligne de paramétrage en base.

En local, avec DDEV : aucune variable `AWS_*`, aucun conteneur MinIO.

Tout appel à `read()`, `putPro()` ou `move()` est donc voué à l'échec. Pire : `getBucket()` renvoie `null` et le service échoue **silencieusement** (`return false`, sans exception).

Une recette qui se contente de constater que « ça n'a pas planté » peut donc passer sans que rien ne se soit réellement produit.

Il fallait exercer ce flux pour trois tickets successifs sur le même périmètre, à chaque fois sur une implémentation prête mais pas encore livrée.

## Deux solutions, toutes les deux valables

Deux approches étaient possibles.

1. **MinIO.** Ajouter un conteneur S3-compatible au `.ddev/config.yaml` de l'équipe, et faire accepter à `AwsService` un endpoint et des credentials statiques en environnement de développement.

2. **Un double maison.** Créer un _fake_ de `AwsService` qui redirige les opérations vers le système de fichiers local (`var/fake-s3/`), puis le brancher à la place du vrai service par un bloc `when@dev` non commité. Une fois la recette terminée, le double disparaît.

Les deux sont valables.

Le choix n'est donc pas une question de faisabilité mais une question de **contexte**.

## `when@dev` : substituer une implémentation pour un seul environnement

[`when@<env>`](https://symfony.com/doc/current/configuration.html#configuration-environments) (introduit dans Symfony 5.3) permet de scoper de la configuration à un environnement **dans un fichier de configuration normal**, plutôt que dans un fichier séparé sous `config/services/dev/`.

Le bloc n'est pris en compte que lorsque `kernel.environment` correspond à l'environnement `<env>` ciblé et il est traité après le corps principal du fichier. Il peut donc redéfinir des services existants.

En production, ce bloc n'est pas pris en compte : le conteneur de production ne contient aucune définition issue de cet override.

C'est précisément ce qui en fait un bon réceptacle pour un hack temporaire : tout l'override tient dans **un bloc contigu et greppable**, en fin d'un seul fichier.

On le voit facilement au `git diff` et le supprimer est trivial. De toute façon c'est pour un test, normalement on ne livre rien à la fin.

Le plus petit changement réversible possible.

```yaml
# ─── TEMPORAIRE — recette locale, NE PAS COMMITER ───
when@dev:
    services:
        App\Service\AwsService:
            ...
```

## `class:` contre `alias:` : redéfinir, ou simplement pointer ailleurs

Classiquement un override consiste à remplacer la classe utilisée par le service de test :

```yaml
when@dev:
    services:
        App\Service\AwsService:
            class: App\Service\FakeAwsServiceForManualTesting
```

Dans le cas rencontré, cette configuration aboutit à une erreur au premier appel :

> [!fail]
> Too few arguments to function\
> App\Service\FakeAwsServiceForManualTesting::\_\_construct(),\
> 0 passed ... and exactly 3 expected

Pourquoi ?

Il faut regarder comment le conteneur a été construit.

Le  [`services.yaml`](https://symfony.com/doc/current/service_container.html#the-default-service-configuration) par défaut contient notamment des `_defaults` (`autowire: true`, `autoconfigure: true`, `bind:`...) puis une ressource :

```yaml
services:
    # default configuration for services in *this* file
    _defaults:
        autowire: true
        autoconfigure: true

    # makes classes in src/ available to be used as services
    App\:
        resource: '../src/'

    # ...
```

Cette ressource enregistre notamment `App\Service\AwsService` et `App\Service\FakeAwsServiceForManualTesting` comme services, avec leurs définitions issues de l'auto-découverte.

Mais une configuration placée sous `when@dev.services` constitue une nouvelle couche de configuration. Il faut donc être prudent lorsqu'on y redéfinit un service : **on ne doit pas supposer que toute la configuration implicite de la définition initiale sera conservée telle quelle**.

Dans le cas rencontré, la redéfinition avec `class:` n'a pas conservé la configuration nécessaire au constructeur du fake. Le service s'est retrouvé avec une définition qui ne savait plus résoudre ses trois dépendances.

On pourrait rendre cette redéfinition fonctionnelle en lui redonnant ce dont elle a besoin, par exemple avec `autowire: true` ou des `arguments:` explicites.

Mais ce n'est pas ce que l'on cherche ici, on ne veut pas **redéfinir** `AwsService`.
On veut dire :

> « Quand quelqu'un demande `AwsService` en développement, donne-lui plutôt ce service-là. »

C'est exactement le rôle d'un alias.

```yaml
when@dev:
    services:
        App\Service\AwsService:
            alias: App\Service\FakeAwsServiceForManualTesting
            public: true
```

Un **alias** n'est pas une nouvelle définition. C'est un pointeur : l'identifiant `App\Service\AwsService` se résout vers le service enregistré sous `App\Service\FakeAwsServiceForManualTesting`.

La définition du fake existe déjà grâce à l'auto-découverte de `src/`. Elle conserve donc sa propre configuration et son [autowiring](https://symfony.com/doc/current/service_container/autowiring.html).

On ne rouvre aucune définition : on change simplement **vers laquelle le conteneur pointe**.

`public: true` est nécessaire ici parce qu'une commande console jetable va également récupérer le service par son identifiant.

> [!tip] En bref
>
> **`class:` sert à configurer une définition ; `alias:` sert à dire « à cet endroit, utilise cette autre implémentation ».**
>
> Ce n'est pas une règle absolue pour toutes les substitutions Symfony, mais c'est un excellent réflexe lorsqu'on dispose déjà de deux services correctement définis : si le besoin est simplement de faire pointer un identifiant vers une autre implémentation, l'alias est l'expression la plus étroite de l'intention.
>
> On ne reconstruit pas ce qui existe déjà. On change le pointeur.

## Choisir en fonction du contexte, pas des capacités

MinIO est plus fidèle à une infrastructure S3 réelle. Ça n'en fait pas le bon choix ici.
Les axes qui ont tranché sont les suivants.

### Rayon d'impact

La solution MinIO modifie `AwsService` qui est déjà commité, partagé par toute la plateforme, présent dans tous les environnements, y compris les chemins S3 de production.

La solution avec le double ne touche aucun code commité : un fichier neuf et un bloc `when@dev`, tous deux jetés à la fin.

Le coût d'une erreur est donc borné par ce qu'on met en jeu.

### Amortissement, ou sur-ingénierie

MinIO est un **investissement**.

Il devient intéressant si l'équipe doit régulièrement tester des flux S3 en local. Le besoin réel ici était beaucoup plus petit : trois tickets sur deux semaines, puis probablement plus rien avant des mois.

Sans récurrence pour l'amortir, construire le harnais MinIO revient à payer un coût d'infrastructure, de configuration et de maintenance pour une capacité que personne n'a demandée.

Le besoin est temporaire, la solution peut donc l'être aussi.

### Demi-vie et réversibilité

Le hack a une demi-vie de quelques jours. Le retirer, c'est supprimer le bloc et le fake, puis éventuellement vider le cache.

La modification MinIO est permanente par construction. Or une chose permanente réclame un propriétaire, de la documentation, une ligne d'onboarding et de la maintenance.

Une branche `endpoint` dans `AwsService`, que plus personne n'exerce quelques mois plus tard, est exactement le genre de code qui peut finir par accueillir un bug sans que personne ne s'en aperçoive.

### Alignement des modes de défaillance

Le double échoue comme le comportement attendu par le métier :

```
fichier absent → lecture vide → badge « non importé ».
```

Pas de faux vert.

MinIO, lui, peut échouer pour des raisons qui n'ont rien à voir avec le métier : mauvais bucket, mauvais endpoint, path-style, région, credentials...

On se retrouve alors à tester le **harnais de test**.

### Fidélité consommée

La recette valide ici du métier :

- le moteur de réimport parse-t-il correctement le fichier de rejets ?
- insère-t-il les bonnes lignes ?
- bascule-t-il correctement l'état ?

Ce métier est indifférent à l'origine des octets.

Reproduire fidèlement la sémantique S3 (cohérence, multipart, ACL, etc.) ajoute donc une fidélité que le test ne lit jamais.

**La fidélité qu'on ne consomme pas est un coût, pas une qualité.**

### Coût de communication

Un relecteur qui voit `FakeAwsServiceForManualTesting` et un bloc `NE PAS COMMITER` a tout compris en trente secondes.

MinIO demande davantage : une note de conception, une explication en équipe, une mise à jour du guide d'onboarding, et potentiellement une réponse à la question :

> « C'est quoi ce paramètre `endpoint` sur `AwsService` ? »

Et cela, pendant toute la durée de vie de la solution.

## Ce que le double contient

Le double ne cherche pas à reproduire S3.
Il reproduit uniquement **la surface publique réellement appelée par le code sous test**.

Les helpers privés (`put`, `list`, `check`) ne peuvent pas être surchargés ; on surcharge donc les wrappers publics utilisés par l'application :

```php
class FakeAwsServiceForManualTesting extends AwsService
{
    private string $root;

    public function __construct(
        KernelInterface $kernel,
        LoggerInterface $logger,
        ParametersService $parametersService
    ) {
        parent::__construct($kernel, $logger, $parametersService);

        $this->root = $kernel->getProjectDir() . '/var/fake-s3';
    }

    public function read(
        string $app,
        string $filename,
        string $folder
    ): ?string {
        $path = "{$this->root}/" . trim($folder, '/') . "/$filename";

        return is_file($path)
            ? (file_get_contents($path) ?: '')
            : '';
    }

    public function putPro(
        string $filename,
        string $content,
        string $folder
    ): bool {
        $path = "{$this->root}/" . trim($folder, '/') . "/$filename";

        @mkdir(dirname($path), 0777, true);

        return file_put_contents($path, $content) !== false;
    }

    // putShop / putFTP / copy / delete* / list* :
    // même forme, sur var/fake-s3/.

    // move() n'est pas surchargée :
    // la classe mère la fait en copy()+delete().
}
```

Ce n'est pas un émulateur S3 et c'est volontaire. Le double implémente uniquement ce que le flux testé consomme.

## Tester le métier sans navigateur

Pour piloter les actions du contrôleur sans passer par le navigateur, une commande console jetable injecte le **même service métier** que le contrôleur.

Ce service est désormais backé par le fake grâce à l'alias.

La commande appelle donc les mêmes méthodes que le parcours applicatif.

Tout le cahier de test peut se dérouler en CLI ; le navigateur ne sert plus qu'à confirmer l'UI.

C'est aussi ce qui rend défendable l'argument :

> **On a validé le métier, pas S3.**

## Le principe

Deux réflexes de séniorité ressortent de cette expérience, l'un technique, l'autre architectural.

- Pour **substituer** une implémentation, on ne redéfinit pas sa configuration si l'on peut simplement pointer vers une autre définition existante. `alias:` exprime cette intention ; `class:` est à utiliser lorsqu'on veut réellement configurer ou redéfinir une définition.
- On choisit la solution dont le coût, **humain autant que technique**, est proportionné à la taille et à la durée de vie réelles du problème : rayon d'impact, maintenance, onboarding, réversibilité, fréquence d'utilisation.

Un jetable assumé bat souvent un permanent mal entretenu.

Et quand le contexte change, on refait le calcul.

Ici, le besoin était temporaire. Le double l'était aussi.

Le signe que le choix était bon est peut-être le plus concret : le pattern a été capturé dans la base de connaissances de l'équipe, puis réutilisé tel quel sur les deux tickets suivants.

Vingt minutes de mise en place, trois fois, contre un chantier de plusieurs jours.

**Ce n'était pas la solution la plus complète. C'était la solution proportionnée.**
