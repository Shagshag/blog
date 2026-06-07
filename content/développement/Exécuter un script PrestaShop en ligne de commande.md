---
publish: true
modified: 2025-05-10T10:07
tags:
  - command line
  - php
  - prestashop
---

Le plus propre pour lancer un script PrestaShop en ligne de commande est de créer un controller pour ça.

Pour l’appeler voici la syntaxe :

```sh
php -f [dossier de la boutique]index.php "fc=module&module=[nom du module]&controller=[nom du controller]"
```

Soit dans mon cas

```sh
php -f /var/www/index.php "fc=module&module=backupdatabase&controller=cron"
```

Ensuite le code du controller

```php
<?php
class BackupDatabaseCronModuleFrontController extends ModuleFrontController
{
    public function init()
    {
        $this->module->cron();
        die();
    }
}
```
