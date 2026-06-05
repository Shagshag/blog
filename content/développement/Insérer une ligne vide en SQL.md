---
publish: true
modified: 2025-06-17T19:53
tags:
  - SQL
---

Rien de surprenant mais c'est la première fois que j'ai à insérer une ligne sans aucune donnée dans une table.

La requête est donc

```sql
INSERT INTO `table` () VALUES ();
```

Toutes les valeurs par défaut seront utilisées
