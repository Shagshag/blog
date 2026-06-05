---
publish: true
modified: 2025-05-10T10:07
tags:
  - calculatrice
  - shell
  - ubuntu
---

Je dois faire plein de calculs à coller dans un css, c’est très gênant d’avoir à corriger tous les résultats pour remplacer les virgules par des points.

Pour que la calculatrice d’Ubuntu utilise le point comme séparateur décimal, il faut la lancer comme suit dans un terminal :

```bash
LC_NUMERIC=en_US.UTF-8 gnome-calculator
```

Source : https://forums.linuxmint.com/viewtopic.php?p=1366261\&sid=628026c11647ae21afbe12b8eec60941#p1366261
