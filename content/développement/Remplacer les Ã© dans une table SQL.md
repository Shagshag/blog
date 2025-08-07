---
{"date":"2017-12-13T09:03:38+01:00","tags":["encodage","SQL","utf-8"],"publish":true,"created":"2025-05-01T15:10","updated":"2025-06-17T19:56:17.379+02:00","PassFrontmatter":true}
---


Je garde ça ici parce que ça arrive mais pas suffisamment souvent pour que je m’en souvienne d’une fois sur l’autre.

Si dans votre table des champs ressemblent à “TrÃ¨s bon produit .J’en suis trÃ¨s satisfaite” c’est qu’il y a eu un soucis à un moment. Un import foireux, un script bugué peu importe.

Pour corriger ça il suffit de lancer les requêtes suivants :

```sql
UPDATE table SET field = REPLACE(field, CAST(_latin1'à' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'à');
UPDATE table SET field = REPLACE(field, CAST(_latin1'À' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'À');
UPDATE table SET field = REPLACE(field, CAST(_latin1'â' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'â');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Â' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Â');
UPDATE table SET field = REPLACE(field, CAST(_latin1'ä' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'ä');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Ä' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Ä');
UPDATE table SET field = REPLACE(field, CAST(_latin1'ç' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'ç');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Ç' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Ç');
UPDATE table SET field = REPLACE(field, CAST(_latin1'è' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'è');
UPDATE table SET field = REPLACE(field, CAST(_latin1'È' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'È');
UPDATE table SET field = REPLACE(field, CAST(_latin1'é' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'é');
UPDATE table SET field = REPLACE(field, CAST(_latin1'É' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'É');
UPDATE table SET field = REPLACE(field, CAST(_latin1'ê' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'ê');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Ê' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Ê');
UPDATE table SET field = REPLACE(field, CAST(_latin1'ë' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'ë');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Ë' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Ë');
UPDATE table SET field = REPLACE(field, CAST(_latin1'î' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'î');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Î' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Î');
UPDATE table SET field = REPLACE(field, CAST(_latin1'ï' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'ï');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Ï' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Ï');
UPDATE table SET field = REPLACE(field, CAST(_latin1'ô' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'ô');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Ô' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Ô');
UPDATE table SET field = REPLACE(field, CAST(_latin1'ö' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'ö');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Ö' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Ö');
UPDATE table SET field = REPLACE(field, CAST(_latin1'ù' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'ù');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Ù' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Ù');
UPDATE table SET field = REPLACE(field, CAST(_latin1'û' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'û');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Û' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Û');
UPDATE table SET field = REPLACE(field, CAST(_latin1'ü' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'ü');
UPDATE table SET field = REPLACE(field, CAST(_latin1'Ü' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, 'Ü');
UPDATE table SET field = REPLACE(field, CAST(_latin1'–' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, '–');
UPDATE table SET field = REPLACE(field, CAST(_latin1'‘' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, '‘');
UPDATE table SET field = REPLACE(field, CAST(_latin1'…' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, '…');
UPDATE table SET field = REPLACE(field, CAST(_latin1'•' AS CHAR CHARACTER SET utf8) COLLATE utf8_bin, '•');
```

“table” et “field” sont à remplacer bien sûr.