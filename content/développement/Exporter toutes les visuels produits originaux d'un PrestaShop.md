---
publish: true
modified: 2025-05-10T10:07
tags:
  - prestashop
  - shell
---

```sh
cd img/p
find . * | grep -P "^\d.*\d+\.jpg" | zip ../../visuels.zip -@
```

Créé un fichier visuels.zip à la racine de la boutique avec toutes les visuels.
