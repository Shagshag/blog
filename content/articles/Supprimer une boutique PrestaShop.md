---
{"date":"2018-03-16T14:07:18+01:00","tags":["php","prestashop"],"publish":true,"PassFrontmatter":true}
---


Voici un script qui supprime une boutique PrestaShop. Il suffit de le placer à la racine de sa boutique en FTP ou autre et de le visiter avec son navigateur.

⚠ Le script supprime le répertoire de PrestaShop avec tous ses fichiers et sous répertoires et toutes les tables de la base de données qui ont le préfixe de PrestaShop.

⚠⚠ Le script ne demande pas de confirmation. Vous le lancez, il supprime tout.

```php
<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$root = dirname(__FILE__);
$server = false;
$user = false;
$password = false;
$database = false;
$prefix = false;

if (file_exists($root.'/app/config/parameters.php')) {
    $parameters = (include $root.'/app/config/parameters.php');
    $server = $parameters['parameters']['database_host'];
    $user = $parameters['parameters']['database_user'];
    $password = $parameters['parameters']['database_password'];
    $database = $parameters['parameters']['database_name'];
    $prefix = $parameters['parameters']['database_prefix'];
} elseif (file_exists($root.'/config/settings.inc.php')) {
    include $root.'/config/settings.inc.php';
    $server = _DB_SERVER_;
    $user = _DB_USER_;
    $password = _DB_PASSWD_;
    $database = _DB_NAME_;
    $prefix = _DB_PREFIX_;
} else {
    die();
}

if (!$server || !$user || !$database || !$prefix) {
    die();
}

dropTables($server, $user, $password, $database, $prefix);
rrmdir($root);

// https://stackoverflow.com/questions/1589278/sql-deleting-tables-with-prefix#1589324
// https://stackoverflow.com/a/10664265/2530962
function dropTables($server, $user, $password, $database, $prefix)
{
    $link = mysqli_connect($server, $user, $password, $database);
    $query = 'SET SESSION group_concat_max_len = 999999999;
    SELECT CONCAT( \'DROP TABLE \', GROUP_CONCAT(table_name) , \';\' )
        AS statement FROM information_schema.tables
        WHERE table_schema = \''.mysqli_real_escape_string($link, $database).'\'
            AND table_name LIKE \''.mysqli_real_escape_string($link, $prefix).'%\';';
    if (mysqli_multi_query($link, $query)) {
        do {
            if ($result = mysqli_store_result($link)) {
                while ($row = mysqli_fetch_array($result)) {
                    $drop_query = $row[0];
                }
                mysqli_free_result($result);
            }
        } while (mysqli_more_results($link) && mysqli_next_result($link));
    }

    echo 'MySQL "'.$drop_query.'"<br/>';
    mysqli_query($link, $drop_query);
}

// https://stackoverflow.com/questions/3338123/how-do-i-recursively-delete-a-directory-and-its-entire-contents-files-sub-dir#3338133
function rrmdir($dir)
{
    if (is_dir($dir)) {
        $objects = scandir($dir);
        foreach ($objects as $object) {
            if ($object != "." && $object != "..") {
                if (is_dir($dir."/".$object)) {
                    rrmdir($dir."/".$object);
                } else {
                    echo 'Delete '.$dir."/".$object.'    ';
                    if (unlink($dir."/".$object)) {
                        echo 'OK';
                    } else {
                        echo 'ERROR';
                    }
                    echo '<br/>';
                }
            }
        }
        echo 'Delete '.$dir.'    ';
        if (rmdir($dir)) {
            echo 'OK';
        } else {
            echo 'ERROR';
        }
        echo '<br/>';
    }
}
```

Aussi sur [Github](https://gist.github.com/Shagshag/4cf2bb1d7f4200409cf47dbdc33275ad)