---
publish: true
description: Convertir un timestamp Excel en timestamp Unix en PHP.
created: 2025-05-01T15:10
modified: 2026-09-28T12:20
tags:
  - php
---

Avec [PHP-ExcelReader](http://sourceforge.net/projects/phpexcelreader/), on se retrouve parfois avec des timestamps Excel au lieu de date. Voici comment les convertir en timestamps unix.

```php
$timestampExcel = 40544;
$timestampUnix = 86400*($timestampExcel - 25569);
echo date('Y-m-d', $timestampUnix); // 2011-01-01
```
