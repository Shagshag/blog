---
publish: true
description: La requête SQL pour insérer une ligne qui n'utilise que les valeurs par défaut de la table.
created: 2025-06-17T15:03
modified: 2026-09-28T12:21
tags:
  - sql
---

Rien de surprenant mais c'est la première fois que j'ai à insérer une ligne sans aucune donnée dans une table.

La requête est donc

```sql
INSERT INTO `table` () VALUES ();
```

Toutes les valeurs par défaut seront utilisées
