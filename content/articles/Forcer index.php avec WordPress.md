---
date: 2011-01-20T14:36:00+01:00
tags:
  - index_html
  - php
  - wordpress
publish: true
---

WordPress a une mauvaise habitude : si vous allez à la racine de votre blog en tapant <http://www.example.com/index.php,> il vous redirigera vers <http://www.example.com/> . De même <http://www.example.com/index.php?cat=1> est redirigé vers <http://www.example.com/?cat=1> .

En général c’est une bonne chose : tout le monde s’en fout, l’URL est plus petite et personne n’a besoin de savoir que votre site est en PHP.

Par contre si vous avez un fichier index.html c’est très gênant : impossible de visiter votre blog, on retombe toujours vers index.html puisque c’est la page par défaut sur la plupart des serveurs.

Donc voici comment faire pour forcer l’utilisation de index.php dans les URL :

Fichier wp-includes/link-template.php ligne 1869

```php
    $url .= '/' . ltrim( $path, '/' );
```

devient

```php
    $url .= '/' . ltrim( 'index.php'.$path, '/' );
```

Fichier wp-includes/canonical.php ligne 58

```php
//$original['path'] = preg_replace('|/index.php$|', '/', $original['path']);
```

devient

```php
$original['path'] = preg_replace('|/index.php$|', '/', $original['path']);
```