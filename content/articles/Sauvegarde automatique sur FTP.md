---
date: 2021-10-20T11:25:27+02:00
tags:
  - backup
  - bash
  - ftp
  - sysadmin
publish: true
---

A force je pense avoir un script de sauvegarde FTP efficace.

Il sauvegarde les bases de données ainsi qu’un dossier du serveur et les envoi sur un serveur FTP. Si le serveur FTP est plein, il supprime les sauvegardes les plus anciennes jusqu’à avoir assez de place pour mettre la nouvelle.

Si une erreur arrive, il envoi un mail d’alerte.

Le script nécessite [curlftpfs](https://doc.ubuntu-fr.org/curlftpfs).

## Utilisation :

- Modifiez le script dans la partie configuration
- Enregistrez le sur le serveur, par exemple dans /opt/scripts/backup.sh
- Donnez les droits d’execution au fichier : `chmod +x /opt/scripts/backup.sh`
- Ajoutez une tâche cron : `02 00 * * * /bin/bash /opt/scripts/backup.sh > /var/log/backup.log 2>&1`

```bash
#!/bin/bash

### Configuration ###

### MYSQL ###
MUSER="" # MySQL user, must can execute 'show databases'
MPASS="" # MySQL password
MHOST="" # MySQL host

### FTP ###
FTPD="/" # FTP folder
FTPUSER="" # FTP user
FTPPASS="" # FTP password
FTPHOST="" # FTP host
FTPSIZE=107374182400 # Size of the FTP in Bytes (here 100 GB)

### Others ###
EMAIL="" # Email to send alerts
FILES_DIR="/home" # Directory to backup

### End of configuration ###

### Check system ###

if ! [ -x "$(command -v tar)" ]; then
  echo 'Error: tar is not installed.'
  exit 1
fi

if ! [ -x "$(command -v gzip)" ]; then
  echo 'Error: gzip is not installed.'
  exit 1
fi

if ! [ -x "$(command -v mysql)" ]; then
  echo 'Error: mysql is not installed.'
  exit 1
fi

if ! [ -x "$(command -v mysqldump)" ]; then
  echo 'Error: mysqldump is not installed.'
  exit 1
fi

if ! [ -x "$(command -v curl)" ]; then
  echo 'Error: curl is not installed.'
  exit 1
fi

if ! [ -x "$(command -v curlftpfs)" ]; then
  echo 'Error: curlftpfs is not installed.'
  exit 1
fi

if ! [ -x "$(command -v fusermount)" ]; then
  echo 'Error: fusermount is not installed.'
  exit 1
fi

if ! [ -d "$FILES_DIR" ]; then
  echo "Error: $FILES_DIR does not exists."
  exit 1
fi

### Start ###

echo $(date +"%Y-%m-%d %T")" Start of process"

NOW=$(date +%Y%m%d) # current date to have the file with the name-YYYYMMDD.tar.gz

FTP_DIR=$(mktemp -d -t ftp-XXXXXXXXXX) # create local FTP directory

# check if directory was created
if [ -d "$FTP_DIR" ]; then
  echo $(date +"%Y-%m-%d %T")" Created local FTP directory $FTP_DIR"
else
  echo "Error: Could not create local FTP directory $FTP_DIR"
  echo "Could not create local FTP directory $FTP_DIR" | mail -s "Backup Error" "#EMAIL"
  exit 1
fi

BACKUP_DIR=$(mktemp -d -t bk-XXXXXXXXXX) # create backup directory

if [ -d "$BACKUP_DIR" ]; then
  echo $(date +"%Y-%m-%d %T")" Created backup directory $BACKUP_DIR"
else
  echo "Error: Could not create backup directory $BACKUP_DIR"
  echo "Could not create backup directory $BACKUP_DIR" | mail -s "Backup Error" "#EMAIL"
  rm -rf "$FTP_DIR"
  echo $(date +"%Y-%m-%d %T")" Deleted local FTP directory $FTP_DIR"
  exit 1
fi

# deletes the temp directories when leaving the script
function cleanup {
  if [ -d "$FTP_DIR" ]; then
    fusermount -u "$FTP_DIR"
    rmdir "$FTP_DIR"
    echo $(date +"%Y-%m-%d %T")" Deleted local FTP directory $FTP_DIR"
  fi
  if [ -d "$BACKUP_DIR" ]; then
    rm -rf "$BACKUP_DIR"
    echo $(date +"%Y-%m-%d %T")" Deleted backup directory $BACKUP_DIR"
  fi
  echo $(date +"%Y-%m-%d %T")" End of process"
}

# register the cleanup function to be called on the EXIT signal
trap cleanup EXIT

# implementation of script starts here
curlftpfs ftp://$FTPHOST$FTPD -o user="$FTPUSER:$FTPPASS" "$FTP_DIR"

echo $(date +"%Y-%m-%d %T")" FTP mounted in $FTP_DIR"

### Files backup ###

echo $(date +"%Y-%m-%d %T")" Starting files backup"

WORKING_DIR=$BACKUP_DIR/$NOW

echo $(date +"%Y-%m-%d %T")" Create $WORKING_DIR directory"
mkdir -p "$WORKING_DIR"

echo $(date +"%Y-%m-%d %T")" Backup directory /etc to $WORKING_DIR/etc.tar"
tar -cf "$WORKING_DIR/etc.tar" "/etc" # to simplify will copy it all
echo $(date +"%Y-%m-%d %T")" Backup directory $FILES_DIR to $WORKING_DIR/files.tar"
tar -cf "$WORKING_DIR/files.tar" "$FILES_DIR"

ARCHIVE=$BACKUP_DIR/files-$NOW.tar.gz

echo $(date +"%Y-%m-%d %T")" Compress directory $WORKING_DIR to $ARCHIVE"
tar -zcf "$ARCHIVE" --remove-files "$WORKING_DIR"
rm -rf "$WORKING_DIR"

echo $(date +"%Y-%m-%d %T")" Files backup created in $ARCHIVE"

### check free space on ftp server ###
ARCHIVE_SIZE=$(stat -c%s "$ARCHIVE")
echo $(date +"%Y-%m-%d %T")" File size : $ARCHIVE_SIZE"
FTP_DIR_SIZE=$(du -cb "$FTP_DIR" | awk 'END{print $1}')
echo $(date +"%Y-%m-%d %T")" FTP space used $FTP_DIR_SIZE"
while [ $(($FTP_DIR_SIZE+$ARCHIVE_SIZE)) -ge $FTPSIZE ];
do
    FILE_TO_DELETE=$(ls -t "$FTP_DIR" | tail -1)
    echo $(date +"%Y-%m-%d %T")" Delete $FILE_TO_DELETE from FTP"
    rm "$FTP_DIR/$FILE_TO_DELETE"
    FTP_DIR_SIZE=$(du -cb "$FTP_DIR" | awk 'END{print $1}')
    echo $(date +"%Y-%m-%d %T")" FTP space used $FTP_DIR_SIZE"
done

echo $(date +"%Y-%m-%d %T")" Copy $ARCHIVE to FTP"

curl --user $FTPUSER:$FTPPASS --upload-file "$ARCHIVE" ftp://$FTPHOST$FTPD
if [ $? != 0 ]; then
  echo "Error: Could not copy $ARCHIVE to FTP server"
  echo "Error when coping $ARCHIVE to FTP server" | mail -s "Backup Error" "#EMAIL"
else
  echo $(date +"%Y-%m-%d %T")" Files backup moved to FTP"
fi

### clear ###

echo $(date +"%Y-%m-%d %T")" Delete $ARCHIVE"
rm -rf "$ARCHIVE"
echo $(date +"%Y-%m-%d %T")" End of files backup"

### Databases backup ###
echo $(date +"%Y-%m-%d %T")" Starting databases backup"

WORKING_DIR=$BACKUP_DIR/$NOW
echo $(date +"%Y-%m-%d %T")" Create $WORKING_DIR directory"
mkdir -p "$WORKING_DIR"

### Backup each databases ###
DBS="$(mysql -u $MUSER -h $MHOST -p$MPASS -Bse 'show databases')"
if [ $? != 0 ]; then
  echo "Error: Could not list databases"
  echo "Could not list databases" | mail -s "Backup Error" "#EMAIL"
  return 1
fi

for DB in $DBS
do
    mkdir "$WORKING_DIR/$DB"
    DB_ARCHIVE=$WORKING_DIR/$DB/$DB.sql.gz
    echo $(date +"%Y-%m-%d %T")" Backup database $DB to $DB_ARCHIVE"
    MYSQL_PWD=$MPASS mysqldump --add-drop-table --single-transaction --skip-lock-tables --allow-keywords -q -c -u $MUSER -h $MHOST "$DB" | gzip -9 > "$DB_ARCHIVE"
done

ARCHIVE=$BACKUP_DIR/databases-$NOW.tar.gz
echo $(date +"%Y-%m-%d %T")" Compress directory $WORKING_DIR to $ARCHIVE"
tar -zcf "$ARCHIVE" --remove-files "$WORKING_DIR"
rm -rf "$WORKING_DIR"

echo $(date +"%Y-%m-%d %T")" Databases backup created in $ARCHIVE"

### check free space on ftp server ###
ARCHIVE_SIZE=$(stat -c%s "$ARCHIVE")
echo $(date +"%Y-%m-%d %T")" File size : $ARCHIVE_SIZE"
FTP_DIR_SIZE=$(du -cb "$FTP_DIR" | awk 'END{print $1}')
echo $(date +"%Y-%m-%d %T")" FTP space used $FTP_DIR_SIZE"
while [ $(($FTP_DIR_SIZE+$ARCHIVE_SIZE)) -ge $FTPSIZE ];
do
    FILE_TO_DELETE=$(ls -t "$FTP_DIR" | tail -1)
    echo $(date +"%Y-%m-%d %T")" Delete $FILE_TO_DELETE from FTP"
    rm "$FTP_DIR/$FILE_TO_DELETE"
    FTP_DIR_SIZE=$(du -cb "$FTP_DIR" | awk 'END{print $1}')
    echo $(date +"%Y-%m-%d %T")" FTP space used $FTP_DIR_SIZE"
done

echo $(date +"%Y-%m-%d %T")" Copy $ARCHIVE to FTP"
curl --user $FTPUSER:$FTPPASS --upload-file "$ARCHIVE" ftp://$FTPHOST$FTPD
if [ $? != 0 ]; then
  echo "Error: Could not copy $ARCHIVE to FTP server"
  echo "Error when coping $ARCHIVE to FTP server" | mail -s "Backup Error" "#EMAIL"
else
  echo $(date +"%Y-%m-%d %T")" Database backup moved to FTP"
fi

### clear ###
echo $(date +"%Y-%m-%d %T")" Delete $ARCHIVE"
rm -rf "$ARCHIVE"
echo $(date +"%Y-%m-%d %T")" End of databases backup"
```

Ce fichier est disponible sur [Github](https://gist.github.com/Shagshag/acd208c48253b3b43ca941ceb4f3ad9a)