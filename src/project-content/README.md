# Featured project content

Edit the four HTML files in this folder to update the home page lightboxes.
They are HTML fragments: the gallery supplies the dialog and Close button.
The Projects page uses its own image preview and is independent of these files.

- `urban-thermal-stress.html`
- `japanese-tales.html`
- `different-target-groups.html`
- `south-america.html`

The `<aside>` holds the year, tools, categories and resource links. The `<article>`
holds the title, context and images. Keep `id="gallery-title"` on the main title.
Add as many `<p>`, `<section>`, `<h3>` and `<figure>` elements as needed, and
interleave text with figures within `featured-gallery__works` for longer stories.

Asset URLs resolve from the home page: use `./img/filename.jpg` for images in
`public/img` and `./doc/filename.pdf` for PDFs in `public/doc`. Use descriptive
image alt text and captions. For resource links that open a new tab, use
`target="_blank" rel="noopener noreferrer"` and indicate the new tab in the label.

To add another project, create an HTML file here and set the card's
`project-content` attribute in `index.html` to the filename without `.html`.
Vite bundles the HTML automatically; run `npm run build` after editing.
