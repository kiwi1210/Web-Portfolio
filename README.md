# Portfolio

## Optimize images

Run this manually when images are added or replaced in `public/img`:

```sh
npm run images:optimize
```

The command converts PNG, JPEG, WebP, and TIFF files to lowercase `.jpg`, limits each image to 2400 px on its longest side without enlarging smaller images, and uses JPEG quality 82. It also updates matching image references in the project's HTML, CSS, and JavaScript files and removes the superseded source files after each replacement is written successfully.

Animated GIFs are left unchanged so their animation is preserved. Transparent pixels are placed on a white background because JPEG does not support transparency.
