---
{"date":"2025-06-17T15:09:26+02:00","publish":true,"tags":["SQL"],"PassFrontmatter":true}
---

Il n'est pas possible en SQL de définir l'auto-incrément d'une table en fonction d'une requête.

```sql
ALTER TABLE `table` AUTO_INCREMENT = 10; -- ✅ Valide
ALTER TABLE `table` AUTO_INCREMENT = (SELECT (MAX(`number`) + 1) FROM `other_table`); -- ❌ Invalide

```

Il faut donc passer par une [procédure](https://sql.sh/cours/procedure-stockee) qui créé une requête à partir du résultat de la requête voulue puis l'execute.
## Pour une nouvelle table

```sql
DELIMITER $
CREATE PROCEDURE `tbl_wth_ai`(IN `ai_to_start` INT)
BEGIN

	SET @s=CONCAT(
		'CREATE TABLE `table` (
			`number` int(11) auto_increment NOT NULL,
			CONSTRAINT table_pk PRIMARY KEY (`number`)
		)
		AUTO_INCREMENT = 
		', 
		`ai_to_start`
	);

	PREPARE stmt FROM @s;
	EXECUTE stmt;
	DEALLOCATE PREPARE stmt;
END $
DELIMITER ;

CALL tbl_wth_ai((SELECT (MAX(`number`) + 1) FROM `other_table`));
DROP PROCEDURE IF EXISTS tbl_wth_ai;
```

## Pour une table existante

```sql
DELIMITER $
CREATE PROCEDURE `tbl_wth_ai`(IN `ai_to_start` INT)
BEGIN

	SET @s=CONCAT(
		'ALTER TABLE `table` AUTO_INCREMENT = ', 
		`ai_to_start`
	);

	PREPARE stmt FROM @s;
	EXECUTE stmt;
	DEALLOCATE PREPARE stmt;
END $
DELIMITER ;

CALL tbl_wth_ai((SELECT (MAX(`number`) + 1) FROM `other_table`));
DROP PROCEDURE IF EXISTS tbl_wth_ai;
```

Source : https://stackoverflow.com/questions/32550239/how-to-set-auto-increment-from-another-table