---
{"date":"2020-10-29T09:55:19+01:00","tags":["jQuery","wordpress"],"publish":true,"PassFrontmatter":true}
---


A partir de la version 5.5 de WordPress, jQuery Migrate n’est plus activé par défaut. Par conséquent les vieux plugins (dans mon cas un Divi version 3) peuvent ne plus fonctionner.

L’erreur la plus commune semble être <span class="lang:default decode:true crayon-inline ">xxx.live is not a function</span>

Pour corriger ce problème il faut installer [Enable jQuery Migrate Helper](https://wordpress.org/plugins/enable-jquery-migrate-helper/) qui le réactive.

Source : <https://wordpress.org/support/topic/jqeuery-error-live-is-not-a-function/#post-13256885>