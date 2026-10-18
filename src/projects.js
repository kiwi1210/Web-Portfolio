import "./style.css";
import { initImageLightbox } from "./image-lightbox.js";

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

  const mediaItems = projects.map((project) => {
    const media = project.querySelector(".editorial-project__media");
    const title = project.querySelector("h2")?.textContent?.trim() || "project image";
    media.setAttribute("aria-label", `View ${title} larger`);
    return media;
  });

  initImageLightbox({
    triggers: mediaItems,
    getTitle: (media, image) =>
      media.closest(".editorial-project")?.querySelector("h2")?.textContent?.trim() ||
      image.alt,
  });

  if ("IntersectionObserver" in window) {
    editorialGrid.classList.add("has-reveal");

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );

    projects.forEach((project, index) => {
      project.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
      revealObserver.observe(project);
    });
  }
}
