---
{"date":"2025-05-16T10:00:01+02:00","publish":true,"tags":["MySQL"],"PassFrontmatter":true}
---

Doctrine est pratique mais pour voir la requête finale exécutée par le serveur c'est compliqué.
Le plus simple est de demander directement à ce dernier de les enregistrer.

## Ponctuellement

Pour cela il faut exécuter les requêtes suivantes sur le serveur

```sql
SET GLOBAL log_output = FILE;
SET GLOBAL general_log_file = "/path/to/logs/mysql.log";
SET GLOBAL general_log = ON
```

et toutes les requêtes seront sauvegardées dans `/path/to/logs/mysql.log`

> [!warning]
>  - `~` ne fonctionne pas dans le nom du fichier, il faut utiliser le chemin absolu.
>  - Le dossier doit exister sur le serveur

il est aussi possible de les sauvegarder dans la table `mysql.general_log` en exécutant à la place

```sql
SET GLOBAL log_output = 'TABLE';
SET GLOBAL general_log = 'ON'
```

On peut ensuite désactiver le log 

```sql
SET GLOBAL general_log = 'OFF'
```

## De façon permanente

C'est le même système mais dans le fichier `my.cnf` dans la partie `[mysqld]`

```cnf
[mysqld]
log_output = FILE
general_log_file = "/path/to/logs/mysql.log"
general_log = ON
```

et toutes les requêtes seront sauvegardées dans `/path/to/logs/mysql.log`

il est aussi possible de les sauvegarder dans la table `mysql.general_log` en ajoutant à la place

```cnf
[mysqld]
log_output = TABLE
general_log = ON
```

> [!warning]
>  Les logs commencent dès que le serveur est démarré et toutes les requêtes sont enregistrées. Il ne faut pas oublier de vider la table ou le fichier régulièrement

Sources :
- https://stackoverflow.com/a/678310/2530962
- https://stackoverflow.com/questions/31574805/mysql-variable-general-log-file-cant-be-set-to-the-value-of-path-to-new-f#comment51104477_31574805
- https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_general_log