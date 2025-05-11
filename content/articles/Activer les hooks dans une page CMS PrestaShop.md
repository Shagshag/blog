---
{"date":"2019-01-30T11:20:35+01:00","tags":["prestashop","smarty"],"publish":true,"PassFrontmatter":true}
---


Normalement le contenu des [pages CMS est statique dans PrestaShop](http://doc.prestashop.com/pages/viewpage.action?pageId=20840877) mais il peut être utile d’y afficher un module pour mettre les dernières réductions, un formulaire d’inscription ou n’importe quoi.

Pour cela il faut modifier le fichier cms.tpl du thème de la boutique.

```smarty
{$cms->content}
```

devient

```smarty
{assign var="cms_content" value=$cms->content}
{include file="string:$cms_content"}
```

ça permet au contenu d’être interprété par Smarty avant l’affichage et on peut donc mettre les appels aux hooks dans sa page CMS sous la forme `{hook h=’displayCarousel’}` ([voir la doc](http://doc.prestashop.com/display/PS16/Managing+Hooks#ManagingHooks-...inatheme)).

En fait cela permet aussi d’utiliser toute [la syntaxe de Smarty](https://www.smarty.net/docs/en/smarty.for.designers.tpl), les `foreach` , `include` et tout le reste