---
publish: true
title: "9 GB of Twig cache: one template compiled per page in the PrestaShop 8 back office"
lang: en
created: 2026-10-04T00:00:00
modified: 2026-10-04T02:45
tags:
  - symfony
  - prestashop
  - php
---

# 9 GB of Twig cache: one template compiled per page in the PrestaShop 8 back office

_`template_from_string()`, more than 80,000 files, and a folder that nothing purges_

_Also available in [[9 Go de cache Twig - un template compilé par page dans le back-office PrestaShop 8|French]]._

This article was born from a digression. During the incident told in [[14 minutes of cache-warmup on EFS - when a PrestaShop back office becomes unreachable|14 minutes of `cache:warmup` on EFS]], I also had to delete a specific template in the Twig cache (`var/cache/prod/twig/`). While looking for it, I stumbled on a **9 GB** folder.

```sh
$ du -sh var/cache/prod/twig
9G    var/cache/prod/twig
```

## [That's a lot of nuts!](https://www.youtube.com/watch?v=k_APmvXOMDo)

A search in this folder revealed tens of thousands of `__string_template__` entries.

```sh
$ grep -lr '__string_template__' ./var/cache/prod/twig/ 2>/dev/null | wc -l
82173
```

First reflex: look for a homemade `createTemplate()` in the custom code.

There isn't one. No module does that on the Twig side. The only `createTemplate()` calls in the custom scope are Smarty calls, which feed `var/cache/*/smarty`, not `var/cache/*/twig`. Ruled out.

The real culprit is ~~Colonel Mustard~~ PrestaShop 8's core itself.

## The mechanism: `template_from_string()` on every page

Every back office page based on a legacy `AdminController` (nearly the whole back office) goes through [`layout.html.twig`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/src/PrestaShopBundle/Resources/views/Admin/layout.html.twig#L25-L40), which opens with:

```twig
{% extends(template_from_string(
  getLegacyLayout(
    app.request.attributes.get('_legacy_controller'),
    layoutTitle is defined ? layoutTitle : '',
    ...
  )
)) %}
```

[`getLegacyLayout()`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/src/PrestaShopBundle/Twig/LayoutExtension.php#L175-L247) does more than inject a few variables. It fetches the complete legacy layout, rendered on the Smarty side, page title, breadcrumb, toolbar buttons with their tokens, help link, admin URL included.

It splits that HTML around the `{$content}` marker, then re-encodes the header and footer as a series of Twig literals via [`escapeSmarty()`](https://github.com/PrestaShop/PrestaShop/blob/8.2.0/src/PrestaShopBundle/Twig/LayoutExtension.php#L249-L260). Twig enforces a hard limit of 8191 characters (`2^13 - 1`) per literal; PrestaShop splits into 2000-character chunks to stay well below it. All this HTML becomes the argument of `template_from_string()`.

But this layout isn't the same from one page to another. It embeds the page title, the breadcrumb, buttons whose URLs contain a security token, and these elements change with the page and the record displayed. The resulting HTML is therefore rarely identical from one request to the next.

And Twig names a template created from a string after the fingerprint of that entire string: [`createTemplate()`](https://github.com/twigphp/Twig/blob/3.x/src/Environment.php#L459-L465) produces `__string_template__` followed by the hash of the text. A single character of difference means a different name, therefore a different compiled file in the cache.

`template_from_string()` compiles a new entry, `__string_template__<hash>`, every time. Almost never reused, because it's so specific.

This isn't an application bug. It's the mechanism that bridges the old controller system and modern Twig rendering, across a good part of the PrestaShop 8 back office, as is.

And nothing purges this folder on its own: without manual intervention, this folder only keeps growing.

## Solution

I don't want to modify PrestaShop's core for this. The simplest is to regularly clean the cache folder with a daily cron job.

```sh
find var/cache/prod/twig -type f -mtime +7 -delete
```

Emptying `var/cache/prod/twig` has no consequence: a missing template is recompiled on the fly, on the next request that needs it. Emptying the DI container, conversely, can block the whole back office for the duration of a recompilation: that's the incident told in [[14 minutes of cache-warmup on EFS - when a PrestaShop back office becomes unreachable|the previous article]].

That's the least intuitive lesson of this series: in Symfony, "clearing the cache" isn't a single operation. It's a set of independent caches, with rebuild costs and blast radii that have nothing to do with one another. Knowing them separately is what lets you target the intervention instead of purging everything blindly.
