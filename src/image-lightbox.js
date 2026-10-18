export function initImageLightbox({ triggers, getTitle }) {
  const items = [...triggers];
  if (items.length === 0) return;

  const lightbox = document.createElement("dialog");
  lightbox.className = "project-lightbox";
  lightbox.setAttribute("aria-label", "Project image preview");
  lightbox.innerHTML = `
    <button class="project-lightbox__close" type="button" aria-label="Close image preview">
      <span aria-hidden="true">&times;</span>
    </button>
    <figure class="project-lightbox__figure">
      <img class="project-lightbox__image" alt="" />
      <figcaption class="project-lightbox__caption"></figcaption>
    </figure>
  `;
  document.body.append(lightbox);

  const lightboxImage = lightbox.querySelector(".project-lightbox__image");
  const lightboxCaption = lightbox.querySelector(".project-lightbox__caption");
  const closeButton = lightbox.querySelector(".project-lightbox__close");
  let opener = null;

  const closeLightbox = () => lightbox.close();

  const openLightbox = (trigger) => {
    const image = trigger.querySelector("img");
    if (!image) return;

    opener = trigger;
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = getTitle?.(trigger, image) || image.alt;
    document.body.classList.add("has-lightbox-open");
    lightbox.showModal();
    closeButton.focus();
  };

  items.forEach((trigger) => {
    const isNativeControl = trigger.matches("button, a, input, select, textarea");

    if (!isNativeControl) {
      trigger.tabIndex = 0;
      trigger.setAttribute("role", "button");
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(trigger);
        }
      });
    }

    trigger.addEventListener("click", () => openLightbox(trigger));
  });

  closeButton.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  lightbox.addEventListener("close", () => {
    document.body.classList.remove("has-lightbox-open");
    lightboxImage.removeAttribute("src");
    opener?.focus();
    opener = null;
  });
}
