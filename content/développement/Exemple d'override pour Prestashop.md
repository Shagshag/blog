---
{"date":"2011-05-13T07:50:00+02:00","tags":["développement","exemple","override","prestashop"],"publish":true,"created":"2025-05-01T15:10","updated":"2025-05-10T10:07:23.167+02:00","PassFrontmatter":true}
---


Ce message se veut être un complément [au billet](http://www.webbax.ch/2011/05/04/prestashop-1-4-loverride-comment-ca-marche-et-ca-sert-a-quoi/) de [Webbax](http://www.webbax.ch)

J’ai eu à travailler sur l’override de [Prestashop](http://www.prestashop.com/). Ce n’est pas compliqué, en tout cas beaucoup plus simple que de modifier les fichiers “cœurs” de Prestashop et si c’est bien fait beaucoup plus stable.

Le but était de rajouter trois [Hooks](http://wiki.psfrance.org/doku.php?id=pour_le_developpeur:hooks:les_differents_hooks_de_prestashop) génériques : un pour l’ajout d’un Objet (produit, fabriquant, bon de réduction…), un pour sa mise à jour et un pour sa suppression.

Dans les versions 1.3 et précédentes j’aurais dû modifier le fichier classes/ObjectModel.php qui est un peu complexe et faire une version pour chaque version de Prestashop.

Mais là que du bonheur, il faut créer un fichier override/classes/ObjectModel.php comme ci-dessous :

```php
<?php

class ObjectModel extends ObjectModelCore
{   
    public function add($autodate = true, $nullValues = false)
    {
        $result = parent::add($autodate, $nullValues);
        if ($result)  Module::hookExec('objectAdd', array('object' => $this));
        return $result;
    }

    public function update($autodate = true, $nullValues = false)
    {
        $result = parent::update($autodate, $nullValues);
        if ($result)  Module::hookExec('objectUpdate', array('object' => $this));
        return $result;
    }

    public function delete($autodate = true, $nullValues = false)
    {
        $result = parent::delete($autodate, $nullValues);
        if ($result)  Module::hookExec('objectDelete', array('object' => $this));
        return $result;
    }
}

```

C’est petit hein ?

Le principe est simple, pour chaque [méthode](http://www.php.net/manual/fr/language.oop5.basic.php) (*add()*, *update()* et *delete()* ), on laisse l’[objet parent](http://www.php.net/manual/fr/language.oop5.inheritance.php) faire son travail ( *parent::add()* ) et en fonction du résultat on appelle ou non le hook.

Ainsi on a pas touché au cœur de Prestashop, le fichier ajouté est simple et facile à maintenir et surtout il sera compatible avec les futures version de Prestashop.