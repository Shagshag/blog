---
publish: true
modified: 2025-05-10T10:01
tags:
  - anonymisation
  - développement
  - prestashop
  - SQL
---

Pour créer un environnement de développement, on duplique celui de production. Sauf qu’il ne faut pas garder les infos personnelles des clients. Déjà c’est dangereux, si vous gérez mal votre affaire vous risquez d’envoyer des mails aux clients et ça force tous les développeurs et intervenants à faire attention au RGPD.

Donc on anonymise tout, c’est plus simple.

Voici un script MariaDB qui anonymise les données clients :

- noms,
- prénoms,
- adresses,
- téléphones,
- e-mails,
- ip,
- communications.\
  Il remplace les lettres par xxx en respectant la casse, les n° de téléphone par 0 en respectant le format et passe les IP en 127.0.0.1.

```sql
UPDATE ps_address pa 
	SET pa.alias = REGEXP_REPLACE(REGEXP_REPLACE(pa.alias, '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	pa.lastname = REGEXP_REPLACE(REGEXP_REPLACE(pa.lastname, '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	pa.firstname = REGEXP_REPLACE(REGEXP_REPLACE(pa.firstname, '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	pa.address1 = REGEXP_REPLACE(REGEXP_REPLACE(pa.address1, '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	pa.address2 = REGEXP_REPLACE(REGEXP_REPLACE(pa.address2, '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	pa.city = REGEXP_REPLACE(REGEXP_REPLACE(pa.city, '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	pa.other = REGEXP_REPLACE(REGEXP_REPLACE(pa.other, '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	pa.company = REGEXP_REPLACE(REGEXP_REPLACE(pa.company, '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	pa.phone = REGEXP_REPLACE(pa.phone, '[0-9]', '0'), 
	pa.phone_mobile = REGEXP_REPLACE(pa.phone_mobile, '[0-9]', '0'), 
	pa.vat_number = REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(pa.vat_number, '[0-9]', '0'), '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	pa.dni = REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(pa.dni, '[0-9]', '0'), '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'); 
	
UPDATE ps_customer c 
SET c.lastname = REGEXP_REPLACE(REGEXP_REPLACE(c.lastname, '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	c.firstname = REGEXP_REPLACE(REGEXP_REPLACE(c.firstname, '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	c.email = CONCAT(c.id_customer, '@example.com');

UPDATE ps_customer c 
SET c.ip_registration_newsletter = '127.0.0.1'
WHERE c.ip_registration_newsletter IS NOT NULL 
	AND c.ip_registration_newsletter != '0'; 

UPDATE ps_customer_message cm 
SET cm.message = REGEXP_REPLACE(REGEXP_REPLACE(cm.message, '(?-i)[a-z]', 'x'), '(?-i)[A-Z]', 'X'), 
	cm.ip_address = '2130706433'; 
	
UPDATE ps_customer_thread ct 
SET ct.email = CONCAT(IF(ct.id_customer > 0, ct.id_customer, '0'), '@example.com');
```

La syntaxe de REGEXP\_REPLACE n’est pas la même pour [MySQL](https://dev.mysql.com/doc/refman/8.0/en/regexp.html#function_regexp-replace) et [MariaBD](https://mariadb.com/kb/en/regexp_replace/), donc il faudra adapter.
