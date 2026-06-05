---
publish: true
modified: 2025-07-31T10:22
tags:
  - php
  - macos
  - ssh
---

Installer l'extension `ssh2` pour PHP sous macOS s'est avéré plus compliqué que prévu. Voici donc la démarche à suivre :

> [!note]
> Je pars du principe que [brew](https://docs.brew.sh/Installation) est déjà installé et qu'il a servi à [installer PHP](https://formulae.brew.sh/formula/php@8.2#default)

## 1. Installer `libssh2`

```sh
brew install libssh2
```

La sortie de la commande indique le dossier d'installation de la bibliothèque :

> \==> Pouring libssh2--1.11.1.arm64\_sequoia.bottle.tar.gz
> 🍺 /opt/homebrew/Cellar/libssh2/1.11.1: 201 files, 1.2MB

Le dossier est donc : `/opt/homebrew/Cellar/libssh2/1.11.1`

> [!note]
> 💡 Si Homebrew indique que `libssh2` est déjà installé, vous pouvez le réinstaller avec :
>
> ```sh
> brew reinstall libssh2
> ```

## 2. Aller dans le dossier de PHP

```sh
cd /opt/homebrew/opt/php@8.2/bin/
```

`8.2` étant la version de PHP utilisée.

## 3. Installer l'extension `ssh2`

```sh
./pecl install ssh2
```

Lorsque le script demande :

> ` libssh2 prefix? [autodetect] :`

Indiquez le chemin du dossier `libssh2` : `/opt/homebrew/Cellar/libssh2/1.11.1/`

Normalement, le processus se termine par :

> `Extension ssh2 enabled in php.ini`

## 4. Vérifier que l'extension est bien installée

```sh
./php -m
```

L'extension `ssh2` doit apparaître dans la liste.
