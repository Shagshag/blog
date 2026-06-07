---
publish: true
modified: 2025-05-10T08:26
tags:
  - netinstall
  - php
  - wordpress
---

Ce script permet d’installer WordPress sans avoir à télécharger l’archive, la décompresser et la déposer sur un serveur.

Il suffit de déposer le script dans le dossier où vous voulez installer WordPress et d’aller le visiter avec votre navigateur.

```php
<?php
// This script download and unzip the latest version of WordPress
//
// Put this file in the folder where you want to install WordPress
// Visit it with your browser
// Follow the installation process

$path = dirname(__FILE__);
$local_file = $path.'/latest.zip';
$remote_file = 'https://wordpress.org/latest.zip';

// download latest version
copyCurl($remote_file, $local_file);

$zip = new ZipArchive;
$res = $zip->open($local_file);
if ($res === true) {
    // unzip
    $zip->extractTo($path);
    $zip->close();

    // delete temporary files
    unlink($local_file);
    unlink(__FILE__);

    // move files to current folder
    rename_dir($path.DIRECTORY_SEPARATOR.'wordpress', $path);

    // redirect to installation script
    header('Location: index.php');
} else {
    echo 'doh!';
}

function copyCurl($remote_file, $local_file)
{
    // https://stackoverflow.com/a/13433965
    if (function_exists('curl_version')) {
        // https://stackoverflow.com/a/13168447
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $remote_file);
        curl_setopt($ch, CURLOPT_VERBOSE, 1);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_AUTOREFERER, false);
        curl_setopt($ch, CURLOPT_REFERER, "http://www.xcontest.org");
        curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        $result = curl_exec($ch);
        curl_close($ch);

        // the following lines write the contents to a file in the same directory (provided permissions etc)
        $fp = fopen($local_file, 'w');
        fwrite($fp, $result);
        fclose($fp);
    } else {
        copy($remote_file, $local_file);
    }
}

// http://de.php.net/manual/fr/function.copy.php#91010
function rename_dir($src, $dst)
{
    $dir = @opendir($src);
    if ($dir && (is_dir($dst) || @mkdir($dst))) {
        while (false !== ( $file = readdir($dir))) {
            if (( $file != '.' ) && ( $file != '..' )) {
                if (is_dir($src.DIRECTORY_SEPARATOR.$file)) {
                    if (!rename_dir($src.DIRECTORY_SEPARATOR.$file, $dst.DIRECTORY_SEPARATOR.$file)) {
                        return false;
                    }
                } else {
                    if (!@copy($src.DIRECTORY_SEPARATOR.$file, $dst.DIRECTORY_SEPARATOR.$file)) {
                        return false;
                    }
                    @unlink($src.DIRECTORY_SEPARATOR.$file);
                }
            }
        }
        closedir($dir);
        @rmdir($src);
        return true;
    }
    return false;
}

```

Disponible aussi sur [Github](https://gist.github.com/Shagshag/18047f3fb9cb9ee86e8496c26337722f)
