import "./style.css";

const navToggle = document.getElementById("nav-toggle");
const mainNav = document.getElementById("main-nav");

navToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

mainNav?.addEventListener("click", (event) => {
  if (event.target.tagName === "A") {
    mainNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

const editorialGrid = document.querySelector(".editorial-grid");

if (editorialGrid) {
  const projects = [...editorialGrid.querySelectorAll(".editorial-project")];

  for (let index = projects.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [projects[index], projects[randomIndex]] = [projects[randomIndex], projects[index]];
  }

  projects.forEach((project) => {
    editorialGrid.append(project);
  });

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

  const openLightbox = (media) => {
    const project = media.closest(".editorial-project");
    const image = media.querySelector("img");
    const title = project?.querySelector("h2")?.textContent?.trim() || image.alt;

    opener = media;
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = title;
    document.body.classList.add("has-lightbox-open");
    lightbox.showModal();
    closeButton.focus();
  };

  projects.forEach((project) => {
    const media = project.querySelector(".editorial-project__media");
    const title = project.querySelector("h2")?.textContent?.trim() || "project image";

    media.tabIndex = 0;
    media.setAttribute("role", "button");
    media.setAttribute("aria-label", `View ${title} larger`);

    media.addEventListener("click", () => openLightbox(media));
    media.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(media);
      }
    });
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
