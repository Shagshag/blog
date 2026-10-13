---
publish: true
description: Une commande shell pour zipper tous les visuels produits originaux d'une boutique PrestaShop.
created: 2025-05-01T15:10
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
