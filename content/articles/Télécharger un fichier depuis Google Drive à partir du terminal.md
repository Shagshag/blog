---
{"date":"2020-09-15T11:19:39+02:00","tags":["console","google","drive"],"publish":true,"PassFrontmatter":true}
---


J’ai eu à restaurer un site dont les archives sont envoyées automatiquement sur Google Drive. C’est un peu compliqué pour les rapatrier depuis la console.

Voici la méthode la plus simple que j’ai trouvée:

1. [Rendre le fichier public](https://support.google.com/a/users/answer/9308873?hl=fr)
2. Trouver l’ID du fichier  
[![Gdoc advanced sharing](https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Gdoc_advanced_sharing.png/512px-Gdoc_advanced_sharing.png)](https://commons.wikimedia.org/wiki/File:Gdoc_advanced_sharing.png "DStrine (WMF) / Public domain")  
 C’est le code qui ressemble à `1DQDioijcvsdf78qsdqsd586` dans le lien de partage. entre les `/`
3. Si le fichier est suffisamment petit pour pouvoir être analysé par l’antivirus de Google : 
```sh
wget --no-check-certificate 'https://drive.google.com/uc?export=download&id=DOCUMENT_ID' -O FILENAME
```
4. S’il est trop gros : ```
```sh
curl -c /tmp/cookies "https://drive.google.com/uc?export=download&id=DOCUMENT_ID" > /tmp/confirmation.html
curl -L -b /tmp/cookies "https://drive.google.com$(cat /tmp/confirmation.html | grep -Po 'uc-download-link" [^>]* href="\K[^"]*' | sed 's/\&amp;/\&/g')" > FILENAME
```

Sources :

- [Direct download from Google Drive using Google Drive API](https://stackoverflow.com/a/32742700)
- [How to download a folder from google drive using terminal?](https://unix.stackexchange.com/a/148674)
- [Partager des fichiers via Google Drive](https://support.google.com/drive/answer/2494822?hl=fr)