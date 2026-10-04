---
publish: true
title: "14 minutes de `cache:warmup` sur EFS : quand un back-office PrestaShop devient injoignable"
created: 2026-10-02T00:00:00
modified: 2026-10-04T16:59
tags:
  - symfony
  - prestashop
  - php
  - aws
  - retour-d-experience
---

_Un `git pull` banal, une correction qui aggrave tout, et une admin qui ne répond plus_

_Also available in [[14 minutes of cache-warmup on EFS - when a PrestaShop back office becomes unreachable|English]]._

Un `git pull` sur le serveur, quelques routes ajoutées à un module PrestaShop. Le genre de déploiement qui ne devrait pas laisser de trace.

L'admin s'est pourtant mis à planter. Deux erreurs et deux corrections plus tard, c'était tout le back-office qui ne répondait plus.

Je raconte l'incident dans l'ordre où je l'ai vécu, fausses pistes comprises.

---

Un peu de contexte. PrestaShop 8 est hybride, mais pas symétriquement : seul le back-office démarre un noyau Symfony complet à chaque requête.

Son point d'entrée, [`admin-dev/index.php`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/admin-dev/index.php), instancie `AppKernel` et appelle `$kernel->handle($request)`, le cycle HTTP complet de Symfony, routing et conteneur de services compris, avec un repli vers le dispatcher legacy uniquement si aucune route ne matche (`NotFoundHttpException`).

Le front, lui, reste entièrement sur l'aiguillage hérité de PrestaShop 1.6 : son [`index.php`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/index.php) se limite à un `Dispatcher::getInstance()->dispatch()`, sans jamais invoquer le noyau Symfony ni son routeur compilé.

Sur l'installation concernée, le déploiement se fait par un simple `git pull` côté serveur : pas de pipeline CI qui reconstruit les assets ou les caches. Et `var/cache/` est monté sur un volume partagé, accessible depuis les instances applicatives et depuis le bastion SSH.

## Routes introuvables après déploiement

Après avoir ajouté de nouvelles routes admin (`config/routes.yml`) à un module et déployé par `git pull`, l'admin s'est mis à planter sur :

```
Unable to generate a URL for the named route "app_my_new_route" as such route does not exist.
```

Symfony compile les routes en deux fichiers au nom **fixe**, indépendant de l'environnement applicatif : `UrlGenerator.php` et `UrlMatcher.php` (accompagnés de leurs `.meta`), stockés dans `var/cache/{env}/`.

Ils sont générés une fois, puis jamais revérifiés. En mode prod (`debug=false`), [`ConfigCache`](https://github.com/symfony/symfony/blob/4.4/src/Symfony/Component/Config/ConfigCache.php#L54-L61) considère le cache comme valide dès lors que le fichier existe. Il ne vérifie plus sa fraîcheur par rapport aux ressources qui l'ont produit.

Un `git pull` qui ajoute des routes ne les invalide donc jamais tout seul.

> [!info] Pourquoi `debug:router` ne l'aurait pas vu
> [`bin/console debug:router`](https://symfony.com/doc/4.4/routing.html#debugging-routes) reconstruit sa liste en relisant les fichiers de routes : [`RouterDebugCommand`](https://github.com/symfony/symfony/blob/4.4/src/Symfony/Bundle/FrameworkBundle/Command/RouterDebugCommand.php#L81) appelle `getRouteCollection()`, qui [charge les ressources via `routing.loader`](https://github.com/symfony/symfony/blob/4.4/src/Symfony/Bundle/FrameworkBundle/Routing/Router.php#L70) (Symfony 4.4, la version embarquée par [PrestaShop 8.2](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/composer.json#L142)). La commande ne passe jamais par `UrlGenerator.php`/`UrlMatcher.php`, les fichiers que le routing HTTP utilise réellement.
>
> Elle aurait donc affiché la nouvelle route pendant que le site plantait. Seule une vraie requête HTTP (ou un appel explicite à `$router->generate()`, ce que fait le rendu d'un menu ou d'un lien Twig) exerce ce cache.

**Solution ciblée** : supprimer uniquement ces quatre fichiers force Symfony à les régénérer proprement à la prochaine requête, sans toucher au reste du cache (Smarty, Doctrine, Twig, conteneur DI) :

```bash
rm -f var/cache/prod/UrlGenerator.php var/cache/prod/UrlGenerator.php.meta \
      var/cache/prod/UrlMatcher.php var/cache/prod/UrlMatcher.php.meta
```

Avant de l'appliquer en production, j'ai validé la méthode : reproduire la suppression dans un environnement de dev/staging, confirmer qu'une commande console ne régénère **pas** ces fichiers, puis vérifier qu'une vraie requête HTTP (la page de login admin, par exemple) les régénère automatiquement.

J'ai comparé les timestamps des fichiers avant et après, et vérifié par un `grep` sur le contenu régénéré que la nouvelle route y figurait bien.

## Le contrôleur n'est plus appelable

Une fois les routes corrigées, nouvelle erreur sur les mêmes pages :

```
The controller for URI "/admin/my-new-page" is not callable: Controller "App\Controller\MyController"
has required constructor arguments and does not exist in the container. Did you forget to define
the controller as a service?
```

Le routing et le conteneur de services (DI) sont mis en cache **séparément**.

Le contrôleur était bien déclaré dans `config/services.yml`, mais le conteneur compilé existant datait d'avant l'ajout de ce service. Corriger le cache de routing ne suffisait pas.

> [!info]
> La structure réelle du cache de conteneur Symfony, utile à connaître si on ne l'a jamais inspectée directement :
>
> ```
> var/cache/prod/
> ├── appAppKernelProdContainer.php        # ~750 octets : un simple stub qui pointe vers...
> ├── appAppKernelProdContainer.php.lock
> ├── appAppKernelProdContainer.php.meta
> ├── appAppKernelProdContainer.preload.php
> └── ContainerA1b2C3d/                    # ... ce dossier : le vrai code compilé, un fichier
>     ├── ...                              #     PHP par service (chargement paresseux)
>     └── getMyControllerService.php
> ```
>
> Le nom du dossier `Container<hash>` change à chaque recompilation, un signal utile pour savoir, en observant simplement le filesystem, si un rebuild a eu lieu récemment.

À ce niveau, j'aurais pu utiliser le bouton « Vider le cache » du back-office, mais il nettoie tout : Symfony, Smarty, XML, médias, index de classes, Doctrine. Smarty et le cache médias sont nécessaires au front et je ne voulais pas y toucher.

Le problème diagnostiqué concerne le routing et le conteneur de services Symfony, deux caches uniquement consommés par le back-office. Cibler à la main les seuls fichiers en cause, plutôt que déclencher un vidage global, était ma façon de limiter le rayon d'impact : ne pas casser côté front ce qui fonctionnait très bien.

J'ai attendu que l'équipe soit réduite (pause repas) pour ne pas les impacter et j'ai supprimé le stub, ses fichiers compagnons, et le dossier, pour forcer une recompilation complète du conteneur à la requête suivante. Ça a semblé être la suite logique de l'étape précédente, même logique, cache différent.

## Et là, c'est le drame…

Après la suppression du cache de conteneur, le back-office est parti en 504 généralisé. Pas seulement la page concernée par le nouveau module : tout l'admin, pour tous les utilisateurs.

Le front, lui, répondait normalement. Comme on l'a vu, il ne passe jamais par le noyau Symfony, donc jamais par les caches en cause.

Au début, sans accès aux logs applicatifs ni au process de l'hôte, j'ai lu du code. Deux hypothèses en sont sorties.

**Hypothèse 1, dans le noyau Symfony.** Le noyau a un garde-fou contre les compilations en double : [`Kernel::initializeContainer()`](https://github.com/symfony/symfony/blob/4.4/src/Symfony/Component/HttpKernel/Kernel.php#L502-L543) tente un verrou exclusif non bloquant sur `<container>.lock`, puis, s'il échoue, repasse en mode bloquant et revérifie entre-temps si le conteneur a été reconstruit ([source](https://github.com/symfony/symfony/blob/4.4/src/Symfony/Component/HttpKernel/Kernel.php#L530-L543)).

Pour cela il faut que `flock()` garantisse réellement l'exclusion mutuelle. C'est vrai en local, mais sur NFS, la garantie dépend du protocole et du montage ([man flock](https://man7.org/linux/man-pages/man2/flock.2.html#BUGS)).

L'infra ne tourne qu'à une instance, mais un redéploiement en fait brièvement coexister deux, le temps du drainage. Si `flock()` accordait un succès aux deux sans qu'elles se voient, chacune compilerait de son côté sur le même dossier. C'était mon hypothèse de départ.

**Hypothèse 2, dans le code de PrestaShop.** Le bouton « Vider le cache » du back-office (détail du code plus bas) lance sa reconstruction dans un `register_shutdown_function`, exécuté à l'intérieur du worker HTTP qui a servi le clic.

Si ce worker est tué par un timeout en plein `cache:warmup`, l'OS libère le `flock()` qu'il détenait sans jamais passer par le bloc `finally` censé le faire proprement. D'autres requêtes en attente pourraient alors reprendre en croyant le conteneur prêt.

Les deux hypothèses sont cohérentes avec ce que dit le code. Reste à savoir si la production est d'accord.

### Ce que l'accès à l'instance a montré

Une fois l'accès obtenu, ça a été plus simple. Aucun `php-fpm` dans le `ps`, seulement des `apache2 -D FOREGROUND` :

```
$ ps -eo pid,ppid,pmem,pcpu,etime,cmd --sort=-pmem | head -5
    PID    PPID %MEM %CPU     ELAPSED CMD
1307323       1  3.4  1.3       31:23 apache2 -D FOREGROUND
1303492       1  2.9  1.5    01:45:00 apache2 -D FOREGROUND
```

Le runtime réel est Apache + mod\_php, donc le [MPM **prefork**](https://httpd.apache.org/docs/current/en/mod/prefork.html) : un process OS entier par connexion, jamais un pool de workers légers.

Ça invalide l'hypothèse 2 : sans PHP-FPM, pas de `request_terminate_timeout` PHP-FPM à dépasser.

Pas de timeout Apache non plus : `apache2.conf` fixe `Timeout` à 7200 secondes, et le `php.ini` de mod\_php aligne `max_execution_time` sur la même valeur. Deux heures de budget, pas trente secondes. Aucune de ces limites n'explique qu'un worker ait été tué en quelques minutes.

Les timestamps du cache de conteneur sont plus parlants :

```
$ ls -la var/cache/prod/
-rw-r--r--. 1 www-data www-data  261168 11:25 UrlGenerator.php
-rw-r--r--. 1 www-data www-data  280129 11:25 UrlMatcher.php
-rw-r--r--. 1 www-data www-data   19898 11:46 annotations.map
-rw-r--r--. 1 www-data www-data     755 11:50 appAppKernelProdContainer.php
-rw-r--r--. 1 www-data www-data       0 11:36 appAppKernelProdContainer.php.lock
-rw-r--r--. 1 www-data www-data  537095 11:50 appAppKernelProdContainer.php.meta
-rw-r--r--. 1 www-data www-data  219847 11:50 appAppKernelProdContainer.preload.php
```

Heures de la console, en GMT. `UrlGenerator.php` et `UrlMatcher.php` datent de 11:25, ma première correction. J'ai ensuite laissé passer une dizaine de minutes, le temps que l'équipe prenne sa pause, avant de supprimer le conteneur. Le `.lock` apparaît à 11:36 et le conteneur est réécrit à 11:50 : la reconstruction a duré 14 minutes.

Le fichier `.lock` actif pendant cette fenêtre est le lock **natif** du noyau Symfony, celui de `Kernel::initializeContainer()` (`appAppKernelProdContainer.php.lock`, posé à 11:36, au début de la fenêtre).

Pourquoi 14 minutes pour une opération censée durer quelques secondes ?

`var/cache` est monté en NFSv4.1 via un proxy local sur AWS EFS. Sur EFS, chaque opération de métadonnées (créer un fichier, vérifier une existence, écrire un répertoire) coûte plusieurs millisecondes.

Le `cache:warmup` génère et écrit une grande quantité de petits fichiers : classes de proxy Doctrine, routing, annotations, classes de services compilées, etc. Sur un filesystem local, l'opération prend quelques secondes. Sur EFS, elle peut prendre un quart d'heure.

### Le mécanisme réel

Pendant ces 14 minutes, une seule chose se passe : un process compile correctement mais aussi lentement que son stockage le lui impose. Sous un verrou qui tient bon du début à la fin.

Pendant ce temps, toute autre requête qui trouve le conteneur manquant tente d'acquérir ce verrou et bloque.

C'est voulu : ça évite que dix requêtes compilent le même conteneur en parallèle. Mais pendant toute l'attente, la requête ne fait rien d'autre que dormir en occupant son process.

En MPM prefork, chaque requête bloquée immobilise un process Apache entier, pas un thread léger. S'il y a assez de trafic concurrent pendant la fenêtre, le pool de workers s'épuise. Plus aucun process disponible. Le site devient injoignable pour tout le monde.

> [!note]
> Comme prévu, il y avait peu de trafic à ce moment-là, ça n'a pas atteint ce stade et seule l'admin a été impacté, les 504 venant très probablement du [load balancer AWS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#load-balancer-attributes), qui coupe la connexion quand le serveur ne répond pas dans son délai d'inactivité.

Donc pas de verrou mal libéré, ni de compilations qui se marchent dessus. Le `.lock` posé à 11:36 n'a été pris que par un seul compilateur : il n'y a eu qu'une seule compilation mais elle a duré 14 minutes. Deux reconstructions concurrentes auraient laissé deux traces, ou un autre profil de verrou.

Une réserve, tout de même : les logs applicatifs (CloudWatch) n'étaient pas accessibles avec les identifiants disponibles, et le fichier de log applicatif local était vide.

Je n'ai donc pas de preuve directe reliant cette fenêtre de reconstruction précise à l'incident raconté plus haut. Seulement une explication cohérente avec tous les indices filesystem disponibles, obtenue en creusant l'infrastructure réelle plutôt qu'en restant sur des hypothèses lues dans le code.

`flock()` a bien travaillé mais c'est la durée de ce qu'il protégeait qui a mis l'admin à genoux. Le pool prefork n'a pas saturé mais son modèle, un process OS entier par requête bloquée, aurait transformé cette lenteur en panne générale sous trafic normal.

Ça élimine l'hypothèse 1, au moins au regard des indices disponibles. Pas besoin de faire appel à une défaillance du verrou. L'explication la plus simple suffisait.

## Conclusion

Un déploiement par `git pull` sans étape de cache-warming explicite reproduira ce genre d'erreur au prochain déploiement qui touche le routing ou le conteneur.

Le correctif tient en une ligne, exécutée en CLI après le `git pull`, pendant que le site continue de servir depuis l'ancien cache :

```bash
php bin/console cache:clear --env=prod --no-debug
```

`cache:clear` (avec warmup) [construit le nouveau cache **avant** de supprimer l'ancien](https://github.com/symfony/symfony/commit/315180cd3bcb1a014713669f1af728589b1b9c57) : le site reste servi par l'ancien conteneur pendant toute la durée de la recompilation. Sur EFS, cette durée se compte en minutes, ici un quart d'heure, mais elle est invisible pour les utilisateurs.

La CLI, exécutée par un opérateur, sort la compilation du chemin des requêtes qui, sinon, se bloquent dessus une par une.

Ici le verrou n'est pas le problème. Ce qui aurait pu mettre le site à genoux, c'est la combinaison d'un stockage réseau lent pour ce genre d'écriture massive de petits fichiers et d'un serveur qui paie chaque requête en attente avec un process OS complet.

Sur une architecture prefork, une compilation qui prend quatorze minutes au lieu de quelques secondes n'est pas juste lente. Elle affame le pool de workers pendant tout ce temps.

Un verrou qui fonctionne garantit qu'un seul process détient une ressource à un instant donné. Il ne garantit ni que cette ressource se libère vite, ni ce que coûte l'attente de ceux qui patientent derrière.

## Trois pistes, par coût croissant

_Dédier un worker, hors trafic, au warmup après chaque déploiement._ C'est le `cache:clear` de la conclusion, automatisé plutôt que laissé à la mémoire de l'opérateur.

_Sortir `var/cache` du montage réseau._ Le cache est reconstructible, propre à chaque instance, et rien ne justifie de le poser sur un filesystem réseau lent à écrire pour ce type de charge.

> [!note]
> On a vu plus haut que deux instances peuvent exister en même temps lors d'un redéploiement. Pendant ce chevauchement, les deux instances partagent le même `var/cache` EFS. Ça n'a pas joué ici, mais c'est une fenêtre où une recompilation concurrente serait théoriquement possible. Si l'infra doit un jour passer à plusieurs instances permanentes, c'est le premier point à revoir.

_Passer à un runtime qui ne pin pas un process OS entier par requête en attente._ FrankenPHP en mode worker, ou Swoole. PHP-FPM reste un process par requête active, juste découplé du serveur web.

Aucune des trois n'est propre à cet incident. Chacune supprime une des conditions qui l'ont rendu possible.

## Annexe 1 : Le risque du bouton « Vider le cache »

L'hypothèse 2 ne s'est pas vérifiée ici, faute de PHP-FPM.

Le risque reste réel sur tout déploiement qui tourne effectivement sous PHP-FPM avec un `request_terminate_timeout` serré. Ça vaut la peine de le documenter, même si ce n'est pas ce qui s'est produit cette fois.

La route du bouton pointe vers [`PerformanceController::clearCacheAction()`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/src/PrestaShopBundle/Controller/Admin/Configure/AdvancedParameters/PerformanceController.php#L290) :

```php
public function clearCacheAction()
{
    $this->get('prestashop.core.cache.clearer.cache_clearer_chain')->clear();
    $this->addFlash('success', $this->trans('All caches cleared successfully', 'Admin.Advparameters.Notification'));
    return $this->redirectToRoute('admin_performance');
}
```

Ce service enchaîne six clearers. Celui qui nous intéresse est `SymfonyCacheClearer`.

Sa méthode [`clear()`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/src/Adapter/Cache/Clearer/SymfonyCacheClearer.php#L47) pose d'abord un verrou applicatif (`$kernel->locksCacheClear()`, un `flock(LOCK_EX | LOCK_NB)` sur un fichier dédié, distinct du verrou générique de compilation vu plus haut), puis enregistre une `register_shutdown_function` qui fait le vrai travail :

```php
public function clear()
{
    global $kernel;
    if (!$kernel || false === $kernel->locksCacheClear()) {
        return; // déjà en cours ailleurs
    }

    register_shutdown_function(function () use ($kernel) {
        try {
            foreach (['prod', 'dev'] as $environment) {
                $application = new Application($kernel);
                $application->setAutoExit(false);
                $application->doRun(new ArrayInput([
                    'command' => 'cache:clear',
                    '--no-warmup' => true,
                    '--env' => $environment,
                ]), new NullOutput());
            }
            $application = new Application($kernel);
            $application->setAutoExit(false);
            $application->doRun(new ArrayInput([
                'command' => 'cache:warmup',
                '--no-optional-warmers' => true,
                '--env' => 'prod',
                '--no-debug' => true,
            ]), new NullOutput());
        } finally {
            Hook::exec('actionClearSf2Cache');
            $kernel->unlocksCacheClear();
        }
    });
}
```

Ce [`register_shutdown_function`](https://www.php.net/register_shutdown_function) s'exécute dans le worker de la requête HTTP d'origine elle-même, pas dans un sous-processus détaché.

Sur un déploiement PHP-FPM avec un `request_terminate_timeout` court, un worker tué en plein `cache:warmup` libère son `flock()` au niveau OS sans jamais passer par ce bloc `finally`. « Verrou libéré » n'est alors plus synonyme de « travail terminé ».

Les requêtes qui patientaient dans [`AppKernel::waitUntilCacheClearIsOver()`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/app/AppKernel.php#L277-L303) reprennent alors en croyant le conteneur prêt, au mot près du commentaire du code source : « the container has been rebuilt and is good to go ».

Ce bouton pose un second problème, indépendant de tout ce qui précède : son rayon d'action ne correspond pas à celui d'un bug confiné au routing et au conteneur, puisqu'il vide aussi Smarty et les médias, dont le front dépend.

## Annexe 2 : la dérive du cache Twig

Pendant cet incident, il fallait aussi supprimer un template précis dans le cache Twig. En le cherchant je suis tombé sur un dossier de **9 Go**, plus de 80 000 fichiers générés par le back-office de PrestaShop 8 lui-même. Cette découverte fait l'objet d'un article séparé : [[9 Go de cache Twig - un template compilé par page dans le back-office PrestaShop 8|9 Go de cache Twig : un template compilé par page dans le back-office PrestaShop 8]].
