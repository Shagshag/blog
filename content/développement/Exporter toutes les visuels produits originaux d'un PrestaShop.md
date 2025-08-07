---
{"date":"2019-06-19T10:25:48+02:00","tags":["prestashop","shell"],"publish":true,"created":"2025-05-01T15:10","updated":"2025-05-10T10:07:25.862+02:00","PassFrontmatter":true}
---


```sh
cd img/p
find . * | grep -P "^\d.*\d+\.jpg" | zip ../../visuels.zip -@
```

Créé un fichier visuels.zip à la racine de la boutique avec toutes les visuels.