---
{"date":"2019-05-02T11:03:13+02:00","tags":["php","wordpress"],"publish":true,"created":"2025-05-01T15:10","updated":"2025-05-10T10:08:25.386+02:00","PassFrontmatter":true}
---


Voici un script qui supprime un site WordPress. C’est une adaptation de [[développement/Supprimer une boutique PrestaShop\|Supprimer une boutique PrestaShop]]. Il suffit de le placer à la racine du site en FTP ou autre et de le visiter avec son navigateur.

⚠ Le script supprime le répertoire de WordPress avec tous ses fichiers et sous répertoires et toutes les tables de la base de données qui ont le préfixe de WordPress.

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

if (file_exists($root.'/wp-config.php')) {
    include $root.'/wp-config.php';
    $server = DB_HOST;
    $user = DB_USER;
    $password = DB_PASSWORD;
    $database = DB_NAME;
    $prefix = $table_prefix;
} else {
    die();
}

if (!$server || !$user || !$database || !$prefix) {
    die();
}

dropTables($server, $user, $password, $database, $prefix);
rrmdir($root);
mkdir($root);

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

    // echo 'MySQL "'.$drop_query.'"'.PHP_EOL;
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
                    // echo 'Delete '.$dir."/".$object.'    ';
                    if (unlink($dir."/".$object)) {
                        // echo 'OK';
                    } else {
                        // echo 'ERROR';
                    }
                    // echo PHP_EOL;
                }
            }
        }
        // echo 'Delete '.$dir.'    ';
        if (rmdir($dir)) {
            // echo 'OK';
        } else {
            // echo 'ERROR';
        }
        // echo PHP_EOL;
    }
}
```