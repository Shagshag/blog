---
publish: true
description: Depuis WordPress 5.5, jQuery Migrate n'est plus activé et les vieux plugins plantent avec l'erreur xxx.live is not a function. Un plugin règle le problème.
created: 2025-05-01T15:10
modified: 2026-09-28T12:20
tags:
  - javascript
  - wordpress
---

A partir de la version 5.5 de WordPress, jQuery Migrate n’est plus activé par défaut. Par conséquent les vieux plugins (dans mon cas un Divi version 3) peuvent ne plus fonctionner.

L’erreur la plus commune semble être <span class="lang:default decode:true crayon-inline ">xxx.live is not a function</span>

Pour corriger ce problème il faut installer [Enable jQuery Migrate Helper](https://wordpress.org/plugins/enable-jquery-migrate-helper/) qui le réactive.

Source : <https://wordpress.org/support/topic/jqeuery-error-live-is-not-a-function/#post-13256885>
