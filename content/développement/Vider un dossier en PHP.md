---
{"date":"2018-10-04T08:35:17+02:00","tags":["php"],"publish":true,"created":"2025-05-01T15:10","updated":"2025-05-10T10:08:44.419+02:00","PassFrontmatter":true}
---


J’utilise ce script pour vider un dossier rapidement. C’est pratique quand on a seulement un accès FTP et qu’on doit démarrer un nouveau projet.

Il faut le déposer dans le dossier à vider, le lancer avec le navigateur et tout est supprimé.

```php
<?php
/**
* Delete all files and subfolders in the current folder
* I use it to start a new project
* Be careful : There is no confirmation, this script deletes everything it can, including itself
*/

// https://stackoverflow.com/a/17161106/2530962 php glob - scan in subfolders for a file
function rglob($pattern, $flags = 0) {
    $files = (array) glob($pattern, $flags);
    foreach (glob(dirname($pattern).'/*', GLOB_ONLYDIR|GLOB_NOSORT) as $dir) {
        $files = array_merge($files, rglob($dir.'/'.basename($pattern), $flags));
    }
    return $files;
}
// https://stackoverflow.com/a/33059445/2530962 Get all file all subfolders and all hidden file with glob
// https://stackoverflow.com/a/13468943/2530962 Deleting all files from a folder using PHP?

// this line returns warnings because unlink can't delete folders. There will be deleted after
array_map('unlink', rglob(dirname(__FILE__)."/{,.}[!.,!..]*",GLOB_MARK|GLOB_BRACE));

$folders = array_reverse(rglob(dirname(__FILE__)."/{,.}[!.,!..]*",GLOB_MARK|GLOB_BRACE));
array_map('rmdir', $folders);
```