---
publish: true
title: "A Dockerfile that says where it failed: splitting the RUN and retrying pecl install"
description: "A build broken by a 504 from pecl.php.net after PHP's security announcement: splitting a giant RUN to locate the error, then retrying pecl install one extension at a time."
lang: en
created: 2026-10-21T22:59:00
modified: 2026-10-21T23:00
tags:
  - docker
  - php
  - pecl
  - retour-d-experience
---

_A CI build broken by a 504 from pecl.php.net, buried in 40 lines of `&&`_

_disponible aussi en [[Un Dockerfile qui dit où il a planté - découper le RUN et réessayer pecl install|Français]]._

On 20 October 2026, [the PHP security team announced two critical vulnerabilities](https://www.php.net/archive/2026.php#2026-10-20-1). The announcement was of an unusual scale and got wide coverage ([official websites taken offline as a precaution around the world](https://www.reuters.com/world/asia-pacific/eu-agency-warns-websites-may-need-be-taken-offline-php-prepares-patches-2026-10-21/), [Cloudflare's reaction](https://blog.cloudflare.com/php-vulnerabilities-waf-protection/), [OpenAI](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/)...). For us it had an unexpected effect. During the day, our application's builds started failing.

## The failing build

I looked at my company's application [Dockerfile](https://docs.docker.com/reference/dockerfile/). Its `base` stage starts from the [official PHP image](https://hub.docker.com/_/php) and installs the dependencies. About forty lines are grouped in a single [`RUN`](https://docs.docker.com/reference/dockerfile/), chained with `&&`: apt packages, locale, PHP extensions, [Composer](https://getcomposer.org/) installation, `php.ini`, [PECL](https://pecl.php.net/) extensions.

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    libfreetype-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libxslt-dev \
    libz-dev \
    ...
    && pecl install redis \
    && pecl install ssh2-1.4 \
    && rm -rf /tmp/pear \
    && docker-php-ext-enable redis \
    && docker-php-ext-enable ssh2
```

Docker only showed this:

> [!fail]
> process "/bin/sh -c apt-get update && ..." did not complete successfully: exit code: 1

No indication of which command in the chain had failed. I first suspected a new Composer version. With a single `RUN`, there was no way to tell. I went to check: Composer had not released a new version, so the cause was elsewhere. We decided to split the `RUN`.

## Splitting into several RUNs

Each `RUN` becomes a numbered step in [`docker build --progress=plain`](https://docs.docker.com/reference/cli/docker/buildx/build/), for example `[base 7/8] RUN pecl install ...`. It is [cached](https://docs.docker.com/build/cache/) independently of the others. The error points straight at the right block, with the Dockerfile line number.

I made six `RUN`s: packages, locale, PHP extensions, Composer, `php.ini`, PECL. A giant `&&` blinds Docker because the unit of error is the instruction, not the command. (`set -eux` would have traced every command, but the build would have stayed a single block, with no intermediate cache.)

On the next build, the error was on the [PECL installation](https://www.php.net/manual/en/install.pecl.php):

> [!fail]
> buildx failed with: ERROR: failed to build: failed to solve: process "/bin/sh -c pecl install redis && pecl install ssh2-1.4 && rm -rf /tmp/pear && docker-php-ext-enable redis && docker-php-ext-enable ssh2" did not complete successfully: exit code: 1

That let me find this in the log, a bit higher up:

> [!fail]
> Could not download from "https://pecl.php.net/get/redis-6.3.0.tgz", cannot download "pecl/redis" (File https://pecl.php.net:443/get/redis-6.3.0.tgz not valid (received: HTTP/1.1 504 Gateway Timeout))

The problem wasn't in the code: pecl.php.net was overloaded. I assume the wave of updates that followed PHP's announcement saturated the server.

So our build wasn't broken by the vulnerability, which hadn't even been fixed yet. It was broken by everyone's reaction to the announcement of the fix.

## Looking for a PECL mirror

Next I looked for a pecl.php.net mirror to use as a fallback. There is no official mirror you can use that way. The real alternatives are:

- compile the extensions from the GitHub tarballs with [`phpize`](https://www.php.net/manual/en/install.pecl.phpize.php)
- use [mlocati/docker-php-extension-installer](https://github.com/mlocati/docker-php-extension-installer)
- publish the base image to a registry so nothing gets downloaded at every deployment.

The last one is the cleanest, but it is a project of its own. Adding a tool while the build was broken seemed risky to me, so I went for the simplest option: repeated attempts.

## The retry, in three versions

To keep it simple and change as little as possible, I first put both extensions in the same loop:

```dockerfile
RUN for i in 1 2 3 4 5; do pecl install redis ssh2 && break; sleep 10; done
```

Testing the failure case, I saw this wasn't viable. If `redis` installs and `ssh2` fails, the next attempt fails on `redis` with "already installed", which returns a non-zero exit code. The loop can never converge. It needs one loop per extension.

Second version, one loop per extension. If all five attempts fail, the `for` ends without a `break` and returns 0. The build then only fails at `docker-php-ext-enable`, with a message that has nothing to do with the problem. It needs a flag and an explicit `exit 1`.

Final version:

```dockerfile
# pecl.php.net can answer 504 when overloaded: retry each extension separately
# (a combined install would fail on retry with "already installed"), then fail loudly.
RUN set -eu; \
    for ext in redis ssh2-1.4; do \
        ok=0; \
        for attempt in 1 2 3 4 5; do \
            if pecl install "$ext"; then ok=1; break; fi; \
            echo "pecl install $ext failed (attempt $attempt/5), retrying..." >&2; \
            sleep $((attempt * 10)); \
        done; \
        if [ "$ok" != 1 ]; then \
            echo "ERROR: pecl install $ext failed after 5 attempts" >&2; \
            exit 1; \
        fi; \
    done; \
    rm -rf /tmp/pear; \
    docker-php-ext-enable redis ssh2; \
    php --ri redis > /dev/null; \
    php --ri ssh2 > /dev/null
```

The wait grows with each attempt (10 s, 20 s, 30 s, 40 s, 50 s), 150 s in total for an extension that fails five times. The last `sleep` is useless, since it comes right before giving up. I left it in to avoid complicating the Dockerfile.

[`php --ri redis`](https://www.php.net/manual/en/features.commandline.options.php) at the end of the block checks that the extension is really loaded. [`docker-php-ext-enable`](https://hub.docker.com/_/php) can succeed even though the extension doesn't load (a missing dependency, for example). In that case `php --ri` fails, and so does the build.

## Testing the failure

The Dockerfile is [multi-stage](https://docs.docker.com/build/building/multi-stage/). The `base` stage installs the packages and the PHP extensions, and the following ones (Composer dependencies, front-end assets) build on it. So I only build `base`:

```bash
docker build --progress=plain --target base -f .docker/Dockerfile -t test .
```

To check the failure case, I temporarily replaced `ssh2-1.4` with `ssh2-9.9` (a version that doesn't exist) in a copy of the Dockerfile. The output:

```text
pecl install ssh2-9.9 failed (attempt 5/5), retrying...
ERROR: pecl install ssh2-9.9 failed after 5 attempts
```

I haven't tested the retry against a real 504, only with a nonexistent version. A nonexistent version is a permanent error, whereas a 504 is temporary. This test shows that the failure does surface, not that the retry eventually succeeds.

## What this changes

I'm keeping this solution. The separate `RUN`s tell me which step failed and benefit from the cache. The retry saves me from relaunching a build over a passing 504.

It doesn't solve the rest. `pecl install redis` without a version installs the latest one, so the build isn't reproducible. It still depends on a third-party server at every deployment, and it won't survive an outage of several hours. It's a modest improvement, suited to the incident I had.
