---
{"date":"2025-05-11T18:56:07+02:00","publish":true,"tags":["Quartz"],"PassFrontmatter":true}
---

J'utilise [Quartz](https://quartz.jzhao.xyz/) pour générer ce site. A partir de fichiers [Markdown](), il génère un [site statique](https://fr.wikipedia.org/wiki/Page_web_statique).

Par défaut le plugin [Latex](https://quartz.jzhao.xyz/plugins/Latex) est activé, il permet d'afficher des documents écrits en [LaTeX](https://fr.wikipedia.org/wiki/LaTeX) j'image mais je n'en ai pas. Le désactiver permet de s'épargner l'appel à quatre fichiers externes.

De même je n'ai quasiment pas d'image sur ce site, désactiver [CustomOgImages](https://quartz.jzhao.xyz/plugins/CustomOgImages) permet d'économiser du temps de génération.

Avec le plugin [[articles/Utiliser un emoji comme favicon\|FaviconEmoji]], j'ai pu désactiver [Favicon](https://quartz.jzhao.xyz/plugins/Favicon) mais il a fallu [modifier `quartz/components/Head.tsx`](https://github.com/Shagshag/blog/commit/2621f1c24d68c9089a90a887349994b543f8ebaa) pour retirer les éléments inutiles. Quartz n'est pas très souple sur le contenu généré.

Au final les appels se réduisent à un fichier CSS et deux JS, tous locaux. C'est bien 🙂

Il reste le style à revoir. J'aime le minimalisme mais on ne distingue pas la partie principale du site du reste.