---
publish: true
title: "14 minutes of `cache:warmup` on EFS: when a PrestaShop back office becomes unreachable"
lang: en
created: 2026-10-04T00:00:00
modified: 2026-10-04T00:00:00
tags:
  - symfony
  - prestashop
  - php
  - aws
  - retour-d-experience
---

# 14 minutes of `cache:warmup` on EFS: when a PrestaShop back office becomes unreachable

_An ordinary `git pull`, a fix that makes everything worse, and an admin that no longer responds_

_Also available in [[14 minutes de cache-warmup sur EFS - quand un back-office PrestaShop devient injoignable|French]]._

A `git pull` on the server, a few routes added to a PrestaShop module. The kind of deployment that shouldn't leave a trace.

The admin started crashing anyway. Two errors and two fixes later, the entire back office had stopped responding.

I tell the incident in the order I lived it, false leads included.

---

A bit of context. PrestaShop 8 is a hybrid, but not a symmetrical one: only the back office boots a full Symfony kernel on every request.

Its entry point, [`admin-dev/index.php`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/admin-dev/index.php), instantiates `AppKernel` and calls `$kernel->handle($request)`, the full Symfony HTTP cycle, routing and service container included, with a fallback to the legacy dispatcher only if no route matches (`NotFoundHttpException`).

The front office, for its part, stays entirely on the dispatcher inherited from PrestaShop 1.6: its [`index.php`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/index.php) boils down to a `Dispatcher::getInstance()->dispatch()`, never invoking the Symfony kernel or its compiled router.

On the installation in question, deployment is a plain `git pull` on the server: no CI pipeline that rebuilds assets or caches. And `var/cache/` is mounted on a shared volume, accessible from the application instances and from the SSH bastion.

## Routes not found after deployment

After adding new admin routes (`config/routes.yml`) to a module and deploying with `git pull`, the admin started crashing on:

```
Unable to generate a URL for the named route "app_my_new_route" as such route does not exist.
```

Symfony compiles routes into two files with a **fixed** name, independent of the application environment: `UrlGenerator.php` and `UrlMatcher.php` (along with their `.meta` files), stored in `var/cache/{env}/`.

They are generated once, then never rechecked. In prod mode (`debug=false`), [`ConfigCache`](https://github.com/symfony/symfony/blob/4.4/src/Symfony/Component/Config/ConfigCache.php#L54-L61) considers the cache valid as long as the file exists. It no longer checks its freshness against the resources that produced it.

A `git pull` that adds routes therefore never invalidates them on its own.

> [!info] Why `debug:router` wouldn't have caught it
> [`bin/console debug:router`](https://symfony.com/doc/4.4/routing.html#debugging-routes) rebuilds its list by rereading the route files: [`RouterDebugCommand`](https://github.com/symfony/symfony/blob/4.4/src/Symfony/Bundle/FrameworkBundle/Command/RouterDebugCommand.php#L81) calls `getRouteCollection()`, which [loads the resources through `routing.loader`](https://github.com/symfony/symfony/blob/4.4/src/Symfony/Bundle/FrameworkBundle/Routing/Router.php#L70) (Symfony 4.4, the version shipped with [PrestaShop 8.2](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/composer.json#L142)). The command never goes through `UrlGenerator.php`/`UrlMatcher.php`, the files that HTTP routing actually uses.
>
> It would therefore have displayed the new route while the site was crashing. Only a real HTTP request (or an explicit call to `$router->generate()`, which is what rendering a menu or a Twig link does) exercises this cache.

**Targeted fix**: deleting only these four files forces Symfony to regenerate them cleanly on the next request, without touching the rest of the cache (Smarty, Doctrine, Twig, DI container):

```bash
rm -f var/cache/prod/UrlGenerator.php var/cache/prod/UrlGenerator.php.meta \
      var/cache/prod/UrlMatcher.php var/cache/prod/UrlMatcher.php.meta
```

Before applying it in production, I validated the method: reproducing the deletion in a dev/staging environment, confirming that a console command does **not** regenerate these files, then checking that a real HTTP request (the admin login page, for example) regenerates them automatically.

I compared the file timestamps before and after, and checked with a `grep` on the regenerated content that the new route was indeed there.

## The controller is no longer callable

Once the routes were fixed, a new error on the same pages:

```
The controller for URI "/admin/my-new-page" is not callable: Controller "App\Controller\MyController"
has required constructor arguments and does not exist in the container. Did you forget to define
the controller as a service?
```

Routing and the service container (DI) are cached **separately**.

The controller was properly declared in `config/services.yml`, but the existing compiled container predated the addition of this service. Fixing the routing cache wasn't enough.

> [!info]
> The actual structure of the Symfony container cache, useful to know if you've never inspected it directly:
>
> ```
> var/cache/prod/
> ├── appAppKernelProdContainer.php        # ~750 bytes: a simple stub pointing to...
> ├── appAppKernelProdContainer.php.lock
> ├── appAppKernelProdContainer.php.meta
> ├── appAppKernelProdContainer.preload.php
> └── ContainerA1b2C3d/                    # ... this folder: the real compiled code, one
>     ├── ...                              #     PHP file per service (lazy loading)
>     └── getMyControllerService.php
> ```
>
> The `Container<hash>` folder name changes with every recompilation, a useful signal for telling, simply by looking at the filesystem, whether a rebuild happened recently.

At this point I could have used the back office's "Clear cache" button, but it cleans everything: Symfony, Smarty, XML, media, class index, Doctrine. Smarty and the media cache are needed by the front office and I didn't want to touch them.

The diagnosed problem concerns Symfony's routing and service container, two caches consumed only by the back office. Targeting by hand only the files at fault, rather than triggering a global purge, was my way of limiting the blast radius: not breaking on the front office side what worked perfectly well.

I waited until the team was reduced (lunch break) so as not to impact them, and I deleted the stub, its companion files, and the folder, to force a full recompilation of the container on the next request. It seemed like the logical next step after the previous one, same logic, different cache.

## And here comes the drama…

After deleting the container cache, the back office went down with a generalized 504. Not just the page concerned by the new module: the whole admin, for all users.

The front office, for its part, responded normally. As we saw, it never goes through the Symfony kernel, so never through the caches involved.

At first, with no access to the application logs or to the host's processes, I read code. Two hypotheses came out of it.

**Hypothesis 1, in the Symfony kernel.** The kernel has a safeguard against duplicate compilations: [`Kernel::initializeContainer()`](https://github.com/symfony/symfony/blob/4.4/src/Symfony/Component/HttpKernel/Kernel.php#L502-L543) tries a non-blocking exclusive lock on `<container>.lock`, then, if that fails, falls back to blocking mode and rechecks in the meantime whether the container has been rebuilt ([source](https://github.com/symfony/symfony/blob/4.4/src/Symfony/Component/HttpKernel/Kernel.php#L530-L543)).

For that, `flock()` must truly guarantee mutual exclusion. That holds locally, but on NFS, the guarantee depends on the protocol and the mount ([man flock](https://man7.org/linux/man-pages/man2/flock.2.html#BUGS)).

The infra runs on a single instance, but a redeployment briefly makes two coexist, for the duration of the draining. If `flock()` granted success to both without them seeing each other, each would compile on its own on the same folder. That was my initial hypothesis.

**Hypothesis 2, in PrestaShop's code.** The back office's "Clear cache" button (code detailed below) launches its rebuild in a `register_shutdown_function`, executed inside the HTTP worker that served the click.

If that worker is killed by a timeout in the middle of `cache:warmup`, the OS releases the `flock()` it held without ever going through the `finally` block meant to do so cleanly. Other waiting requests could then resume believing the container was ready.

Both hypotheses are consistent with what the code says. It remained to be seen whether production agreed.

### What access to the instance showed

Once I had access, it got simpler. No `php-fpm` in the `ps` output, only `apache2 -D FOREGROUND`:

```
$ ps -eo pid,ppid,pmem,pcpu,etime,cmd --sort=-pmem | head -5
    PID    PPID %MEM %CPU     ELAPSED CMD
1307323       1  3.4  1.3       31:23 apache2 -D FOREGROUND
1303492       1  2.9  1.5    01:45:00 apache2 -D FOREGROUND
```

The actual runtime is Apache + mod\_php, therefore the [**prefork** MPM](https://httpd.apache.org/docs/current/en/mod/prefork.html): one whole OS process per connection, never a pool of lightweight workers.

That rules out hypothesis 2: without PHP-FPM, there is no PHP-FPM `request_terminate_timeout` to exceed.

No Apache timeout either: `apache2.conf` sets `Timeout` to 7200 seconds, and mod\_php's `php.ini` aligns `max_execution_time` on the same value. Two hours of budget, not thirty seconds. None of these limits explains a worker being killed within a few minutes.

The container cache timestamps are more telling:

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

Console times, in GMT. `UrlGenerator.php` and `UrlMatcher.php` date from 11:25, my first fix. I then let about ten minutes go by, so the team could take its break, before deleting the container. The `.lock` appears at 11:36 and the container is rewritten at 11:50: the rebuild took 14 minutes.

The `.lock` file active during that window is the Symfony kernel's **native** lock, the one from `Kernel::initializeContainer()` (`appAppKernelProdContainer.php.lock`, created at 11:36, at the start of the window).

Why 14 minutes for an operation supposed to take a few seconds?

`var/cache` is mounted over NFSv4.1 through a local proxy on AWS EFS. On EFS, every metadata operation (creating a file, checking that one exists, writing a directory) costs several milliseconds.

`cache:warmup` generates and writes a large number of small files: Doctrine proxy classes, routing, annotations, compiled service classes, etc. On a local filesystem, the operation takes a few seconds. On EFS, it can take a quarter of an hour.

### The actual mechanism

During those 14 minutes, only one thing happens: one process compiles correctly, but as slowly as its storage forces it to. Under a lock that holds firm from start to finish.

Meanwhile, any other request that finds the container missing tries to acquire this lock and blocks.

That's by design: it prevents ten requests from compiling the same container in parallel. But for the whole wait, the request does nothing but sleep while holding on to its process.

With the prefork MPM, each blocked request ties up an entire Apache process, not a lightweight thread. If there is enough concurrent traffic during the window, the worker pool runs dry. No process left available. The site becomes unreachable for everyone.

> [!note]
> As expected, there was little traffic at that moment, so it never got to that point and only the admin was affected, the 504s very probably coming from the [AWS load balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#load-balancer-attributes), which cuts the connection when the server doesn't answer within its idle timeout.

So no badly released lock, and no compilations stepping on each other. The `.lock` created at 11:36 was only taken by a single compiler: there was only one compilation, but it lasted 14 minutes. Two concurrent rebuilds would have left two traces, or a different lock profile.

One caveat, though: the application logs (CloudWatch) were not accessible with the credentials I had, and the local application log file was empty.

So I have no direct proof linking this precise rebuild window to the incident told above. Only an explanation consistent with all the filesystem evidence available, obtained by digging into the real infrastructure rather than staying on hypotheses read in the code.

`flock()` did its job, but it's the duration of what it protected that brought the admin to its knees. The prefork pool didn't saturate, but its model, a whole OS process per blocked request, would have turned this slowness into a general outage under normal traffic.

That rules out hypothesis 1, at least given the evidence available. No need to invoke a lock failure. The simplest explanation was enough.

## Conclusion

A deployment by `git pull` without an explicit cache-warming step will reproduce this kind of error at the next deployment that touches routing or the container.

The fix fits in one line, run on the CLI after the `git pull`, while the site keeps serving from the old cache:

```bash
php bin/console cache:clear --env=prod --no-debug
```

`cache:clear` (with warmup) [builds the new cache **before** deleting the old one](https://github.com/symfony/symfony/commit/315180cd3bcb1a014713669f1af728589b1b9c57): the site keeps being served by the old container for the entire duration of the recompilation. On EFS, that duration is counted in minutes, here a quarter of an hour, but it's invisible to users.

The CLI, run by an operator, takes the compilation out of the path of requests that would otherwise block on it one by one.

Here the lock isn't the problem. What could have brought the site to its knees is the combination of slow network storage for this kind of massive writing of small files and a server that pays for every waiting request with a full OS process.

On a prefork architecture, a compilation that takes fourteen minutes instead of a few seconds isn't just slow. It starves the worker pool for all that time.

A lock that works guarantees that only one process holds a resource at a given moment. It guarantees neither that this resource is released quickly, nor what the wait costs those queuing behind.

## Three options, by increasing cost

_Dedicate a worker, outside traffic, to warmup after each deployment._ This is the conclusion's `cache:clear`, automated rather than left to the operator's memory.

_Move `var/cache` off the network mount._ The cache is rebuildable, specific to each instance, and nothing justifies putting it on a network filesystem that's slow to write for this kind of load.

> [!note]
> We saw above that two instances can exist at the same time during a redeployment. During that overlap, the two instances share the same `var/cache` on EFS. It didn't come into play here, but it's a window where a concurrent recompilation would theoretically be possible. If the infra ever moves to several permanent instances, this is the first point to revisit.

_Switch to a runtime that doesn't pin a whole OS process per waiting request._ FrankenPHP in worker mode, or Swoole. PHP-FPM remains one process per active request, just decoupled from the web server.

None of the three is specific to this incident. Each removes one of the conditions that made it possible.

## Appendix 1: the risk of the "Clear cache" button

Hypothesis 2 didn't hold up here, for lack of PHP-FPM.

The risk remains real on any deployment that actually runs under PHP-FPM with a tight `request_terminate_timeout`. It's worth documenting, even though it's not what happened this time.

The button's route points to [`PerformanceController::clearCacheAction()`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/src/PrestaShopBundle/Controller/Admin/Configure/AdvancedParameters/PerformanceController.php#L290):

```php
public function clearCacheAction()
{
    $this->get('prestashop.core.cache.clearer.cache_clearer_chain')->clear();
    $this->addFlash('success', $this->trans('All caches cleared successfully', 'Admin.Advparameters.Notification'));
    return $this->redirectToRoute('admin_performance');
}
```

This service chains six clearers. The one that interests us is `SymfonyCacheClearer`.

Its [`clear()`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/src/Adapter/Cache/Clearer/SymfonyCacheClearer.php#L47) method first takes an application lock (`$kernel->locksCacheClear()`, a `flock(LOCK_EX | LOCK_NB)` on a dedicated file, distinct from the generic compilation lock seen above), then registers a `register_shutdown_function` that does the real work:

```php
public function clear()
{
    global $kernel;
    if (!$kernel || false === $kernel->locksCacheClear()) {
        return; // already in progress elsewhere
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

This [`register_shutdown_function`](https://www.php.net/register_shutdown_function) runs in the worker of the original HTTP request itself, not in a detached subprocess.

On a PHP-FPM deployment with a short `request_terminate_timeout`, a worker killed in the middle of `cache:warmup` releases its `flock()` at the OS level without ever going through that `finally` block. "Lock released" is then no longer synonymous with "work done".

Requests waiting in [`AppKernel::waitUntilCacheClearIsOver()`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/app/AppKernel.php#L277-L303) then resume believing the container is ready, in the very words of the source code comment: "the container has been rebuilt and is good to go".

This button poses a second problem, independent of everything above: its scope doesn't match that of a bug confined to routing and the container, since it also clears Smarty and media, which the front office depends on.

## Appendix 2: the Twig cache drift

During this incident, I also had to delete a specific template in the Twig cache. While looking for it, I stumbled on a **9 GB** folder, more than 80,000 files generated by the PrestaShop 8 back office itself. This discovery is the subject of a separate article: [[9 GB of Twig cache - one template compiled per page in the PrestaShop 8 back office|9 GB of Twig cache: one template compiled per page in the PrestaShop 8 back office]].
