---
{"date":"2013-06-24T10:02:00+02:00","tags":["php"],"publish":true,"created":"2025-05-01T15:10","updated":"2025-05-10T10:07:10.160+02:00","PassFrontmatter":true}
---


La semaine dernière avec [Olea](http://www.oleacorner.com/) on est tombé sur un module PrestaShop tout moche qui avait un code de ce style :

```php
eval(gzinflate(base64_decode(strrev('AYwtRlkyv8MKXlcyNj09QdFyO30S'))));
```

Impossible donc de savoir son action. En enlevant le [eval()](http://www.php.net/eval) pour voir le code

```php
echo gzinflate(base64_decode(strrev('AYwtRlkyv8MKXlcyNj09QdFyO30S')));
```

on tombe sur

```php
eval(base64_encode(str_rot13('DF5fgEZ135HHtrdfcv'))));
```

et ainsi de suite.

Cela s’appelle du [code impénétrable](http://fr.wikipedia.org/wiki/Code_imp%C3%A9n%C3%A9trable) ou de l'obfuscation. Très utilisé pour cacher un vilain code pas beau avec tracker, virus et tout ça.

Donc voici un décodeur pour ce genre de code. En gros il fait la même chose que eval() mais sans exécuter le code.

```php
<?php

$obfuscated = "eval(gzinflate(base64_decode(strrev('AYwtRlkyv8MKXlcyNj09QdFyO30S'))));";
$decoder = new unobfuscate($obfuscated);

echo $decoder->decode(); // echo 'Hello world';


class unobfuscate
{
	public $string; // string to decode
	
	public function __construct($string)
	{
		$this->string = $string;
	}
	
	/**
	* return the decoded string
	* @return string
	**/
	public function decode()
	{
		$x = $this->string;
		
		while (substr($x, 0, 5) == 'eval(') {
			$prev = $x;
			$string = substr($x, 5, strlen($x) - 8);
			$x = $this->my_eval($string);
		}
		echo $x;
	}
	
	/**
	* eval a string without execute it
	* 
	* @param string $string
	* @return string
	**/
	public function my_eval($string) {
		if (
			($string[0] == '\'')
			|| ($string[0] == '"')
		) {
			// found the string 'AYwtRlkyv8MKXlcyNj09QdFyO30S'
			return substr($string, 1, strlen($string) - 2); // 
		} else {
			// we have something like function(xxxx);
			// search the function name
			$pos = strpos($string, '(');
			$function = substr($string, 0, $pos);
			// eval 'xxxx'
			$arg = $this->my_eval(substr($string, $pos+1));
			
			return $function($arg);
		}
	}
}

```

Disponible aussi sur [Github](https://gist.github.com/Shagshag/5848915)

Pour info le code du module en question avait 45 eval() imbriqués et rien de méchant. L’auteur ne voulait juste pas qu’on voit son code. (raté)