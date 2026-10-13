---
publish: true
description: Dans Joomla, RSFirewall! remplace les balises iframe par i-frame. Comment désactiver ce comportement.
created: 2025-05-01T15:10
modified: 2026-09-28T12:20
tags:
  - joomla
---

Si dans Joomla les balises

```html
<span class="lang:default decode:true crayon-inline "><iframe></span>
```

sont remplacées par

```html
<span class="lang:default decode:true crayon-inline "><i-frame></span>
```

, c’est peut être à cause de [RSFirewall!](https://www.rsjoomla.com/joomla-extensions/joomla-security.html)

La solution pour désactiver ce comportement est là : [Scrambled tags (iframe becomes i-frame)](https://www.rsjoomla.com/support/documentation/rsfirewall-user-guide/frequently-asked-questions/scrambled-tags-iframe-becomes-i-frame.html)
Le plus simple est de désactiver la protection pour son IP en l’ajoutant dans Composants > RSFirewall! > Blocklist/Safelist, bouton « Nouveau » et en sélectionnant « Safelist ».
