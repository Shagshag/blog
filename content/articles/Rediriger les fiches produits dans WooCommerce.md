---
{"date":"2021-06-08T11:12:33+02:00","tags":["php","woocommerce","wordpress"],"publish":true,"PassFrontmatter":true}
---


Dans WooCommerce chaque produit a [une page dédiée](https://docs.woocommerce.com/document/marketing-product-pages-writing/#section-4). Dans le panier, les produits renvoient à celles-ci.

Si vous voulez désactiver cette fonctionnalité et afficher une page avec tous vos produits, vous pouvez ajouter ce code à [functions.php](https://developer.wordpress.org/themes/basics/theme-functions/)

```php
// redirige les pages produits
add_action('wp','prevent_access_to_product_page');
function prevent_access_to_product_page(){
  if ( is_product() ) {
    wp_redirect( get_permalink( 269 ) );
  }
}
```

Ainsi toutes les pages produits redirigeront vers la page 269.

Source : [How to disable/hide woocommerce single product page?](https://stackoverflow.com/q/44197739)