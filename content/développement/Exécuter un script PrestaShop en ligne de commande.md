---
{"date":"2017-03-24T10:47:46+01:00","tags":["command line","php","prestashop"],"publish":true,"created":"2025-05-01T15:10","updated":"2025-05-10T10:07:19.893+02:00","PassFrontmatter":true}
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