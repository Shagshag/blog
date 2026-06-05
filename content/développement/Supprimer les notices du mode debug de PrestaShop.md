---
publish: true
modified: 2025-05-10T10:08
tags:
  - prestashop
  - symfony
---

Le mode debug de PrestaShop 1.7 fonctionne trop bien. Par défaut il s’arrête sur toutes les erreurs, avertissement ou notice, ce qui fait que quand un problème, même minime, se trouve en amont de ce que vous voulez corriger, le système s’arrête avant la partie qui vous intéresse.

Par exemple avec PHP 7.4, Doctrine utilisé par PrestaShop affiche un Warning : <https://github.com/doctrine/DoctrineORMModule/issues/579> ce qui empêche tout débogage.

![](medias/2020/03/2020-03-04-17_38_11-Mozilla-Firefox.png)

Pour corriger tout cela, il faut dire à Symfony quelles erreurs afficher :

On a 2 fichiers à modifier « [classes/controller/FrontController.php](https://github.com/PrestaShop/PrestaShop/blob/develop/classes/controller/FrontController.php) » et « [admin/index.php](https://github.com/PrestaShop/PrestaShop/blob/develop/admin-dev/index.php) » dans les deux cas il faut remplacer

```php
Debug::enable();
```

par

```php
Debug::enable(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED & ~E_WARNING);
```

en adaptant le paramètre à ce qu’on veut. La documentation est ici : <https://www.php.net/error_reporting>

Il peut être utile de modifier aussi « [config/defines.inc.php](https://github.com/PrestaShop/PrestaShop/blob/develop/config/defines.inc.php) » en remplaçant

```php
@error_reporting(E_ALL | E_STRICT);
```

par

```php
@error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED & ~E_WARNING);
```
