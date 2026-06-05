---
publish: true
modified: 2025-05-10T10:01
tags:
  - coding
  - développement
  - max_input_vars
  - parse_str
  - php
---

Bon c’est un peu technique mais la fonction PHP [parse\_str](http://www.php.net/manual/fr/function.parse-str.php) est limité par la directive [max\_input\_vars](http://www.php.net/manual/en/info.configuration.php#ini.max-input-vars) ce qui fait que par défaut on ne peut traiter que 1000 paramètres avec cette fonction.

Comme j’ai eu besoin d’en traiter plus que ça voici une réécriture de parse\_str sans limitation. Elle supporte les tableaux imbriqués et c’est déjà pas mal.

```php
/**
 * do the same than parse_str without max_input_vars limitation
 * @param $string array string to parse
 * @return  array query parsed
 **/
function my_parse_str($string) {
  $result = array();
	// find the pairs "name=value"
	$pairs = explode('&', $string);
	$toEvaluate = ''; // we will do a big eval() at the end not pretty but simplier
	foreach($pairs as $pair) {
		list($name, $value) = explode('=', $pair, 2);
		$name = urldecode($name);
		if (strpos($name, '[') !== false) { // name is an array
			$name = preg_replace('|\[|', '][', $name, 1);
			$name = str_replace(array('\'', '[', ']'), array('\\\'', '[\'', '\']'), $name);
			$toEvaluate .= '$result[\''.$name.' = '.urldecode($value).'; '; // $result['na']['me'] = 'value';				
		}
		else {
			$name = str_replace('\'', '\\\'', $name);
			$toEvaluate .= '$result[\''.$name.'\'] = '.urldecode($value).'; '; // $result['name'] = 'value';
		}
	}
	eval($toEvaluate);
	return $result;
}

$array = my_parse_str($query);

```

Disponible aussi sur [Github](https://gist.github.com/Shagshag/5849065) avec des améliorations
