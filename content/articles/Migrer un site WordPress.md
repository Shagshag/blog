---
date: 2018-07-19T14:00:18+02:00
tags:
  - wordpress
publish: true
---

Comment changer un site WordPress de serveur en 3 étapes:

Malgré moi je fait de plus en plus de WordPress. Donc je note ça pour plus tard.

Il faut être sur le serveur source dans le dossier du site.  
On suppose que le site sera dans le dossier www du serveur de destination

1. Copier les fichiers sur le nouveau serveur

```sh
rsync -avz ./ [login serveur destination]@[hote du serveur destination]:www/
```

2. Copier la base de données

```sh
mysqldump -u [utilisateur bdd source] -p[mot de passe bdd source] -h [hote bdd source] [nom bdd source] | sed 's/[domaine source]/[domaine destination]/g' | gzip | ssh [login serveur destination]@[hote du serveur destination] "gunzip | mysql -u [utilisateur bdd destination] -p[mot de passe bdd destination] -h [hote bdd destination] [nom bdd destination]"
```

Explication :

- `mysqldump -u [utilisateur bdd source] -p[mot de passe bdd source] -h [hote bdd source] [nom bdd source]` fait une extraction de la base de données
- `sed ‘s/[domaine source]/[domaine destination]/g’` remplace le nom de domaine dans l’archive
- `gzip` compresse le résultat
- `ssh [login serveur destination]@[hote du serveur destination] "gunzip | mysql -u [utilisateur bdd destination] -p[mot de passe bdd destination] -h [hote bdd destination] [nom bdd destination]"` envoie le tout sur le serveur de destination et lui fait exécuter `gunzip | mysql -u [utilisateur bdd destination] -p[mot de passe bdd destination] -h [hote bdd destination] [nom bdd destination]`
- `gunzip` décompresse l’archive
- `mysql -u [utilisateur bdd destination] -p[mot de passe bdd destination] -h [hote bdd destination] [nom bdd destination]` l’importe dans la nouvelle base de données

3. Paramétrer le nouveau site :

Il faut modifier le fichier wp-config.php avec les identifiants de la nouvelle base de données.