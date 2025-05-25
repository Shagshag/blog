---
date: 2020-10-29T18:15:30+01:00
tags:
  - google
  - drive
  - shell
  - ssh
publish: true
---

Pour faire suite à [Télécharger un fichier depuis Google Drive à partir du terminal](T%C3%A9l%C3%A9charger%20un%20fichier%20depuis%20Google%20Drive%20%C3%A0%20partir%20du%20terminal.md), j’ai eu à télécharger tout un dossier et la méthode décrite ne peut pas fonctionner.

J’ai donc utilisé [rclone](https://rclone.org) et ça fonctionne très bien. C’est plus long parce qu’[il faut créer une application comme décrit dans la documentation](https://rclone.org/drive/#making-your-own-client-id) mais une fois configuré c’est simple.

```sh
rclone copy drive:dossier_source ../dossier_destination
```

Il est dit sur [la page de téléchargement](https://rclone.org/downloads/) comment l’installer mais ce n’est pas utile. Il fonctionne en décompressant l’archive et en l’exécutant dans le dossier créé.