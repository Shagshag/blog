---
{"date":"2025-06-17T15:03:17+02:00","publish":true,"tags":["SQL"],"PassFrontmatter":true}
---

Rien de surprenant mais c'est la première fois que j'ai à insérer une ligne sans aucune donnée dans une table.

La requête est donc

```sql
INSERT INTO `table` () VALUES ();
```

Toutes les valeurs par défaut seront utilisées