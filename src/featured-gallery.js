// Content is authored in separate HTML files and bundled by Vite, so opening a
// project needs no extra network request. Use project-content on each home card.
const projectContent = import.meta.glob("./project-content/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
});

export function initFeaturedGallery() {
  const triggers = [...document.querySelectorAll(".featured .project-card__title-button")];
  if (!triggers.length) return;
  const dialog = document.createElement("dialog");
  dialog.className = "featured-gallery";
  dialog.setAttribute("aria-labelledby", "gallery-title");
  dialog.innerHTML = `
    <div class="featured-gallery__bar"><span>Featured projects / Selected work</span><button type="button" class="featured-gallery__close" aria-label="Close project">Close <span aria-hidden="true">×</span></button></div>
    <div class="featured-gallery__layout"></div>`;
  document.body.append(dialog);
  let opener;
  const close = dialog.querySelector("button");
  const layout = dialog.querySelector(".featured-gallery__layout");
  triggers.forEach(trigger => {
    const card = trigger.closest("project-card");
    const title = card.querySelector("h3").textContent;
    const slug = card.getAttribute("project-content");
    const content = projectContent[`./project-content/${slug}.html`];
    if (!content) throw new Error(`Missing featured project HTML: ${slug}`);
    trigger.setAttribute("aria-label", `Explore project: ${title}`);
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.addEventListener("click", () => {
      opener = trigger;
      // These are trusted, local HTML files maintained with the site source.
      layout.innerHTML = content;
      document.body.classList.add("has-lightbox-open");
      dialog.showModal();
      dialog.scrollTop = 0;
      close.focus();
    });
  });
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("has-lightbox-open");
    layout.replaceChildren();
    opener?.focus();
  });
}
