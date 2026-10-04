---
publish: true
title: The Dockerfile said `fr_FR.UTF-8`. PHP saw `C.UTF-8`
lang: en
created: 2026-09-28T00:00:00
modified: 2026-10-04T16:59
tags:
  - symfony
  - php
  - aws
  - docker
  - retour-d-experience
---

_The Dockerfile describes what the container is supposed to have. It doesn't prove what the application actually uses._

_disponible aussi en [[Le Dockerfile disait `fr_FR.UTF-8`. PHP voyait `C.UTF-8`|Français]]._

A locale bug is deceptive in one particular way: you always think you know the server's configuration (after all, you wrote it yourself, in a version-controlled Dockerfile). The trap is conflating what the container **declares** with what the application process **actually uses**.

This post walks through how that gap surfaced, and how a fix was then verified directly inside an ECS Fargate task running in staging, via [ECS Exec](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html), with no dedicated deployment and no separate staging rig needed. The mechanics of ECS Exec itself (finding the task, IAM prerequisites, quoting) are covered separately in [[ECS Exec en pratique - retrouver sa tâche, ouvrir la session, passer un script sans se battre avec le quoting|a dedicated article]] (in French). Here, the focus is on what the diagnostic revealed.

## The bug

A string-normalization function, used to deduplicate entries before a Doctrine [`flush()`](https://www.doctrine-project.org/projects/doctrine-orm/en/3.6/reference/working-with-objects.html#persisting-entities), stripped accents using the classic method:

```php
iconv('UTF-8', 'ASCII//TRANSLIT', $string);
```

`//TRANSLIT` is one of the [behavioral extensions](https://man7.org/linux/man-pages/man3/iconv_open.3.html) offered by `iconv` implementations (a GNU extension, absent from the POSIX standard). On Linux, the result depends notably on the implementation in use and on the executing process's `LC_CTYPE` locale: a [glibc bug report](https://www.mail-archive.com/debian-glibc@lists.debian.org/msg59606.html) documents exactly this case, with the same `iconv -f utf-8 -t ascii//TRANSLIT` call succeeding under `en_US.utf8` and failing under `C.UTF-8`. Under a strict `C` locale, transliteration fails silently: `"Matériel"` becomes `"Mat?riel"` instead of `"Materiel"`.

So the deduplication key computed on the PHP side was meant to match MySQL's `ci` collation, case- **and** accent-insensitive. Under the `C` locale, it didn't. A duplicate would slip past application-level deduplication and eventually hit a database uniqueness constraint at `flush()` time (a crash downstream of a normalization problem upstream).

The fix that was adopted replaces `iconv` with Symfony's String component:

```php
use function Symfony\Component\String\u;

u($string)->ascii()->toString();
```

[`u()->ascii()`](https://symfony.com/doc/current/string.html#methods-added-by-codepointstring-and-unicodestring) performs the transliteration at the Symfony component level, without depending on PHP's `LC_CTYPE` locale for this step. The component also exposes a dedicated [`AsciiSlugger`](https://symfony.com/doc/current/string.html#slugger) for generating slugs (URLs, identifiers); here the need is a deduplication key, not a slug, so `u()->ascii()` alone is enough, without the casing and separator rules a slugger would add. That said, transliteration rules aren't guaranteed to match `iconv //TRANSLIT`'s exactly: it's a different library, with its own Unicode tables.

The process locale could also have been initialized with `setlocale(LC_ALL, '')`. That's not the choice made here: the fix removes the dependency on `LC_CTYPE` instead of configuring it elsewhere.

## "Just read the Dockerfile, right?"

Before touching AWS at all: the repo has a version-controlled CI/CD pipeline ([`.github/workflows/ci.yml`](https://docs.github.com/en/actions/writing-workflows/about-workflows), [`.docker/Dockerfile`](https://docs.docker.com/reference/dockerfile/), an [ECS task definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html) `.aws/pro.json`). Can't we just **read** these files to know the server's configuration, without running anything on it?

From static analysis:

- `.github/workflows/ci.yml`: the `on: push: branches: ["main"]` trigger deploys to the `pro` ECS service (production); the `develop` branch deploys to `pro-rct` (staging). **Same Dockerfile, same image**: only the target ECS service changes.
- `.docker/Dockerfile` sets a full French locale in an `ENV` instruction:

  ```dockerfile
  ENV LANG="fr_FR.UTF-8" \
      LANGUAGE="fr_FR:fr" \
      LC_ALL="fr_FR.UTF-8" \
      ...
  RUN ... && echo "fr_FR.UTF-8 UTF-8" > /etc/locale.gen && locale-gen fr_FR.UTF-8 ...
  ```

  and installs the `ext-intl` extension.
- The ECS task definition contains no override of `LANG`/`LC_ALL`/`LC_CTYPE` for the `php` container. Nothing at the ECS level contradicts what the Dockerfile sets.

The container's OS environment is therefore configured as `fr_FR.UTF-8`, with `ext-intl` available.

A first live test inside the container (method detailed in the [[ECS Exec en pratique - retrouver sa tâche, ouvrir la session, passer un script sans se battre avec le quoting|ECS Exec article]], in French) measured, from a PHP script, the process's current `LC_CTYPE` locale. Compared against the environment variables at each layer, the problem becomes visible:

```
Dockerfile           LC_ALL=fr_FR.UTF-8
        │
        ▼
PID 1 (entrypoint)    LC_ALL=fr_FR.UTF-8
        │
        ▼
ECS Exec session      LC_ALL=fr_FR.UTF-8
        │
        ▼
PHP (LC_CTYPE)        C.UTF-8   ← break
```

The environment variable is correctly propagated at every layer. But PHP never initialized its `LC_CTYPE` locale from it.

[PHP starts with its locale categories in their initial state](https://sourceware.org/glibc/manual/latest/html_node/Setting-the-Locale.html). The `LANG`, `LC_ALL`, etc. variables present in the environment don't, by themselves, mean the PHP process's `LC_CTYPE` was configured with those values. A call to [`setlocale(LC_ALL, '')`](https://www.php.net/setlocale) explicitly asks the process to sync its locale with the environment.

The value observed here, `C.UTF-8`, isn't the bare `C` locale either: it's a UTF-8 variant of the POSIX locale. It remains distinct from the [ICU](https://icu.unicode.org/) locale used by `ext-intl`, which resolves its own default locale independently of `LC_CTYPE`. `iconv()`, on the other hand, depends directly on the process locale set by the libc.

A `grep -r setlocale` across the application code found only two calls, both scoped to `LC_TIME` (date formatting), never `LC_CTYPE`, never a global `setlocale(LC_ALL, '')`. So this really was a missing `LC_CTYPE` initialization, not a hidden override somewhere in the application.

Static analysis lets you verify the declared configuration. But it doesn't yet tell you what PHP actually uses.

For that, you have to look inside the container.
A local container would have let me reproduce the behavior, provided I rebuilt the exact same image and environment. But the bug was happening in staging: I wanted to first check what the already-deployed PHP was actually doing.

## Verifying the fix inside the real container

The verification script loaded the application's Composer autoloader (`require '/var/www/vendor/autoload.php';`) and then called the private method under test via `ReflectionMethod`, exactly what a PHPUnit unit test would do (the same technique, run against the real deployment instead of the test suite).

```bash
aws ecs execute-command \
  --cluster <cluster-name> --task <task-id> --container php --region <REGION> \
  --interactive \
  --command "/bin/sh -lc 'echo $B64 | base64 -d | php'"
```

The script travels as base64 rather than as a raw argument. The command crosses three successive shell layers (the local shell, the `--command` string, then `/bin/sh -c` inside the container), and a multi-line PHP script with quotes and accented characters always ends up breaking the nested quoting. A `$(... || ...)` had failed this way with `Syntax error: "(" unexpected`, not because of a shell logic error but because of the stacked quoting layers. Routing through base64 removes the problem entirely.

## Result: the fix holds

```
normalizeString("Matériel") under current locale: materiel
normalizeString("Matériel") forced under LC_CTYPE=C: materiel
raw iconv("Matériel") under LC_CTYPE=C (old, pre-fix behaviour): 'Mat?riel'
```

> [!NOTE]
> The issue observed in staging is `C.UTF-8`. To reproduce the old `iconv`'s failing behavior, the test forces `LC_CTYPE=C`, the strictest case, which reproduces the documented defect.

You can see that the old raw-`iconv` behavior does reproduce the bug under `LC_CTYPE=C`, and that `u()->ascii()` normalizes correctly, with or without a forced locale.

The code no longer depends on `LC_CTYPE`. A change in the process locale won't reintroduce this bug.

## Locking in the fix: a regression test

The test inside the container verifies the fix on the real deployment. It doesn't protect against a future regression.

The project has no functional tests with an HTTP kernel. That's not a problem here: forcing the locale needs neither a database nor a container, just `setlocale()`.

```php
final class StringNormalizerTest extends TestCase
{
    public function testAsciiNormalizationIsLocaleIndependent(): void
    {
        $original = setlocale(LC_CTYPE, '0');

        try {
            setlocale(LC_CTYPE, 'C');

            self::assertSame(
                'Materiel',
                StringNormalizer::normalize('Matériel')
            );
        } finally {
            setlocale(LC_CTYPE, $original);
        }
    }
}
```

The `finally` block restores the original locale after the test, so it doesn't pollute the rest of the suite. This test would have caught the bug before it reached production, because it reproduces the exact condition that triggered it: `LC_CTYPE=C`.

## Why this was safe

Running a command inside a staging or production container calls for a few precautions.

In this specific case:

- the diagnostic was read-only;
- the script ran as CLI, in a process isolated from the worker pool serving live traffic (Apache/mod\_php): no in-flight request was affected;
- it touched neither the filesystem, nor the database, nor anything shared;
- `setlocale()` called in this one-off process only affects that process.

One caveat: ECS Exec runs with `root` privileges, which is why the technique should stay a one-off, read-only diagnostic, not a routine practice.

This conclusion only holds if ECS Exec was already enabled on the task. Turning it on, if it isn't, forces a full redeployment of the service. That may have consequences this diagnostic doesn't justify.

## Conclusion

So the real subject wasn't ECS Exec, but the gap between a declared configuration and what the application actually uses.

Here, the locale variable really was present in the container. PHP simply wasn't using it for `LC_CTYPE`.

A few commands inside the container were enough to see it. The regression test now makes sure the code no longer depends on it.

Configuration says what you want. Runtime says what happens.
