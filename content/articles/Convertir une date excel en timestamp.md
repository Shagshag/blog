---
date: 2011-02-01T21:48:00+01:00
tags:
  - conversion
  - excel
  - php
publish: true
---

Avec [PHP-ExcelReader](http://sourceforge.net/projects/phpexcelreader/), on se retrouve parfois avec des timestamps Excel au lieu de date. Voici comment les convertir en timestamps unix.

```php
$timestampExcel = 40544;
$timestampUnix = 86400*($timestampExcel - 25569);
echo date('Y-m-d', $timestampUnix); // 2011-01-01
```