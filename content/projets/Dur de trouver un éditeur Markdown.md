---
publish: true
modified: 2026-06-06T00:24
tags:
  - markdown
---

> [!NOTE]
> **Archive** — Post écrit en juin 2014, migré depuis l'ancien blog. La suite de cette histoire est dans [[Comment ce blog est publié]].

J'ai récemment décidé d'utiliser [Bitbucket](https://fr.atlassian.com/software/bitbucket/overview) pour gérer mes projets.

Je l'utilisai déjà comme dépôt [Mercurial](http://mercurial.selenic.com/) pour quelques modules Prestashop histoire d'avoir une sauvegarde (en plus) mais l'offre gratuite de Bitbucket propose aussi un wiki et un gestionnaire de bug qui sont accessibles même si le dépôt est privé.

J'ai déjà un [wiki global](http://prestawiki.samdha.net/) pour la documentation de mes modules mais il est super lourd et les seuls personnes qui l'éditent sont moi et les bots de spam.\
De plus les wikis de Bitbucket sont des dépôts Mercurial, donc je peux les modifier hors ligne et synchroniser quand c'est bon.

C'est là que ça bloque. J'ai passé des heures à chercher un éditeur bureau [Markdown](http://fr.wikipedia.org/wiki/Markdown) (l'un des formats supportés par le wiki) correct.

J'aurais voulu un éditeur qui :

1. Affiche un aperçu formaté
2. Affiche les images
3. Permet d'ouvrir les pages liées comme sur un wiki

Pour le 3 aucun éditeurs ne le fait 🙁

J'ai essayé :

## [MarkdownPad](http://markdownpad.com/)

![](medias/2014/06/MarkdownPad.png)

Les moins :

- Ne gère pas les images locales.

## [MarkPad](http://code52.org/DownmarkerWPF/)

![](medias/2014/06/MarkPad.png)

Les moins :

- L'éditeur et l'aperçu ne sont pas synchronisés et surtout dès qu'on fait défiler l'éditeur, l'aperçu se remet au début du document. Ingérable.

## MdCharm (mort)

![](medias/2014/06/MdCharm.png)

Les plus :

- Gère les projets (dossiers avec plusieurs fichiers dedans)

Les moins :

- L'affichage des images locales bug dans les projets

## [ReText](https://github.com/retext-project/retext)

![](medias/2014/06/ReText.png)

Les moins :

- Installation très longue car il a fallut installer Python et toutes les dépendances.
- Ne gère pas l'UTF-8 ?? ou je n'ai pas trouvé comment.

## [Haroopad](http://pad.haroopress.com/)

![](medias/2014/06/Haroopad.png)
Mon préféré pour l'instant

Les plus :

- Interface propre et bien pensée
- Permet d'envoyer le texte par e-mail. Pratique pour [Tumblr](https://www.tumblr.com/docs/en/email_publishing)

Les moins :

- Pas d'onglet, c'est moins facile pour s'y retrouver

## Conclusion

Pour l'instant j'utilise [Haroopad](http://pad.haroopress.com/) même s'il ne fait pas tout ce que je voulais.
