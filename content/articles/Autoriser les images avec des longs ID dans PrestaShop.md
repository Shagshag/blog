---
date: 2020-12-15T19:21:12+01:00
tags:
  - prestashop
publish: true
---

Par construction PrestaShop ne peut pas gérer les images avec des ID supérieurs à 9 999 999 (7 chiffres). C’est déjà beaucoup et on a pas souvent besoin de plus mais j’ai eu affaire à un script d’import qui impose les ID d’images et donc ça arrive.

### Pourquoi PrestaShop ne les gèrent pas ?

En fait, PrestaShop n’a pas de soucis avec les ID de 8 chiffres ou plus, tant que la base de données l’accepte, lui aussi. Le problème vient de la façon d’accéder aux images.

L’URL d’une image est `https://example.com/123-large/mon-image.jpg` soit `[url de la boutique]/[ID de l'image]-[format à afficher]/[texte pour le référencement].jpg` et [le fichier `.htaccess`](https://httpd.apache.org/docs/2.4/howto/htaccess.html) explique au serveur que quand on a une url de ce type, il faut aller chercher le fichier qu’il faut dans le dossier des images `/img/p/`

Le fichier .htaccess de PrestaShop ressemble à ça

```htaccess
RewriteRule ^([0-9])(\-[_a-zA-Z0-9-]*)?(-[0-9]+)?/.+\.jpg$ %{ENV:REWRITEBASE}img/p/$1/$1$2$3.jpg [L]
RewriteRule ^([0-9])([0-9])(\-[_a-zA-Z0-9-]*)?(-[0-9]+)?/.+\.jpg$ %{ENV:REWRITEBASE}img/p/$1/$2/$1$2$3$4.jpg [L]
RewriteRule ^([0-9])([0-9])([0-9])(\-[_a-zA-Z0-9-]*)?(-[0-9]+)?/.+\.jpg$ %{ENV:REWRITEBASE}img/p/$1/$2/$3/$1$2$3$4$5.jpg [L]
RewriteRule ^([0-9])([0-9])([0-9])([0-9])(\-[_a-zA-Z0-9-]*)?(-[0-9]+)?/.+\.jpg$ %{ENV:REWRITEBASE}img/p/$1/$2/$3/$4/$1$2$3$4$5$6.jpg [L]
RewriteRule ^([0-9])([0-9])([0-9])([0-9])([0-9])(\-[_a-zA-Z0-9-]*)?(-[0-9]+)?/.+\.jpg$ %{ENV:REWRITEBASE}img/p/$1/$2/$3/$4/$5/$1$2$3$4$5$6$7.jpg [L]
RewriteRule ^([0-9])([0-9])([0-9])([0-9])([0-9])([0-9])(\-[_a-zA-Z0-9-]*)?(-[0-9]+)?/.+\.jpg$ %{ENV:REWRITEBASE}img/p/$1/$2/$3/$4/$5/$6/$1$2$3$4$5$6$7$8.jpg [L]
RewriteRule ^([0-9])([0-9])([0-9])([0-9])([0-9])([0-9])([0-9])(\-[_a-zA-Z0-9-]*)?(-[0-9]+)?/.+\.jpg$ %{ENV:REWRITEBASE}img/p/$1/$2/$3/$4/$5/$6/$7/$1$2$3$4$5$6$7$8$9.jpg [L]
```

Donc quand le serveur reçoit l’URL `https://example.com/123-large/mon-image.jpg` il affiche le fichier `/img/p/1/2/3/123-large.jpg`. C’est rapide et ça ne demande pas de ressource, PrestaShop n’est même pas appelé quand on veut afficher une image produit.

Mais [on ne peut pas utiliser $10 dans un fichier .htaccess](https://stackoverflow.com/a/5849017/2530962), il est interprété comme $1 puis le caractère 0. Comme dans la dernière ligne de l’extrait ci-dessus on utilise $9, on ne peut pas aller plus loin.

### Ma solution

Si on appelle l’URL `https://example.com/123456789-large/mon-image.jpg`, le serveur ne reconnait pas ce format et essaye simplement d’afficher le fichier `/123456789-large/mon-image.jpg` qui n’existe pas et renvoie donc une erreur 404. PrestaShop affiche donc une jolie page pour dire que le fichier n’a pas été trouvée.

L’astuce consiste à utiliser cette page pour afficher l’image demandée en [complétant](https://devdocs.prestashop.com/1.7/modules/concepts/overrides/) [le controller PageNotFound](https://github.com/PrestaShop/PrestaShop/blob/develop/controllers/front/PageNotFoundController.php).

```php
<?php
class PageNotFoundController extends PageNotFoundControllerCore
{
    public function initContent()
    {
        list($filename) = explode('?', $_SERVER['REQUEST_URI']);
        if (preg_match('/([0-9]+)(\-[_a-zA-Z0-9-]*)?\/.*\.jpg/', $filename, $matches)) {
            $path = _PS_ROOT_DIR_.'/img/p/'.implode('/', str_split($matches[1], 1)).'/'.$matches[1].$matches[2].'.jpg';
            if (file_exists($path)) {
                header('Content-Type: '.mime_content_type($path)?:'image/jpg');
                readfile($path);
                die();
            } else {
                header('HTTP/1.1 404 Not Found');
                header('Status: 404 Not Found');
                header('Content-Type: image/gif');
                readfile(_PS_ROOT_DIR_.'/img/404.gif');
                die();
            }
        }
        return parent::initContent();
    }
}
```
Code à placer dans `/override/controllers/front/PageNotFoundController.php`
Fichier disponible sur [Github](https://gist.github.com/Shagshag/9b7ca766e6a855ba17d8af9c71412076)

Le principe est le suivant :

- quand le controller PageNotFound est appelé, on regarde si l’URL correspond à celle d’une image produit,
- si oui on regarde si elle existe, 
  - si oui on l’affiche et c’est terminé
  - si non on affiche une image d’erreur
- si non on laisse le controller gérer

Sources :

- [Overrides dans PrestaShop](https://devdocs.prestashop.com/1.7/modules/concepts/overrides/)
- [Format du fichier .htaccess](https://httpd.apache.org/docs/2.4/howto/htaccess.html)