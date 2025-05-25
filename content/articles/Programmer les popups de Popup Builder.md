---
{"date":"2021-07-28T15:12:00+02:00","tags":["php","wordpress","popup_builder"],"publish":true,"PassFrontmatter":true}
---


La version gratuite du plugin [WordPress Popup Builder](https://wordpress.org/plugins/popup-builder/) ne permet pas programmer l’affichage des popups. Cependant elle créé le [filtre](https://developer.wordpress.org/plugins/hooks/filters/) sgpbOtherConditions qui permet de les désactiver.

Ce filtre est appelé pour chaque popup qui peut s’afficher sur la page et si l’argument ‘status’ à `false` est ajouté à ceux existants, la popup ne s’affiche pas.

```php
	/**
	 * Check Popup conditions
	 *
	 * @since 1.0.0
	 *
	 * @return array
	 *
	 */
	private function isSatisfyForOtherConditions()
	{
		$popup = $this->getPopup();
		$popupOptions = $popup->getOptions();
		$popupId = $popup->getId();

		$dontAlowOpenPopup = apply_filters('sgpbOtherConditions', array('id' => $popupId, 'popupOptions' => $popupOptions, 'popupObj' => $popup));

		return $dontAlowOpenPopup['status'];
	}
```

Pour désactiver automatiquement vos popups, vous pouvez ajouter ce code à [functions.php](https://developer.wordpress.org/themes/basics/theme-functions/)

```php
add_filter('sgpbOtherConditions', 'my_sgpbOtherConditions', 10, 1);

// update popin status
function my_sgpbOtherConditions($args = array()) {
    // if popup is already unactive, do nothing
    if (isset($args['status']) && $args['status'] === false) {
        return $args;
    }

    switch ($args['id']) {
        case 17938: // summer holiday active between 2021-07-30 and 2021-08-01
            $now = time() + 2 * 60 * 60; // for time zone, can be improved
            $from = strtotime('2021-07-30 00:00:00');
            $to = strtotime('2021-08-02 00:00:00');

            // if we are not between 2021-07-30 and 2021-08-01 desactivate the popup
            if (($now < $from) || ($now > $to)) {
                $args['status'] = false;
            }			
            break;
        case 16412:  // covid reassurance unactive between 2021-07-30 and 2021-08-01
            $now = time() + 2 * 60 * 60; // for time zone, can be improved
            $from = strtotime('2021-07-30 00:00:00');
            $to = strtotime('2021-08-02 00:00:00');

            // if we are between 2021-07-30 and 2021-08-01 desactivate the popup
            if (($now >= $from) && ($now <= $to)) {
                $args['status'] = false;
            }
            break;
    }
    return $args;	
}
```

Ainsi la popup 17938 ne sera active qu’entre le 30 juillet et le 1 août 2021 alors que la 16412 ne le sera que le reste du temps.