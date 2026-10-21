// <project-card>
// Light-DOM custom element (no shadow root) — it inherits fonts/colors
// straight from style.css, no style duplication needed.
//
// Attributes:
//   img       - image src
//   title     - project title
//   variant   - "full" for one full-width project or "third" for three per row
//   image-x   - horizontal image position inside its frame (default: "50%")
//   image-y   - vertical image position inside its frame (default: "50%")
//
// Description text is taken from the element's own text content, e.g.:
//   <project-card img="..." title="..." variant="full">
//     Short description here.
//   </project-card>

class ProjectCard extends HTMLElement {
  connectedCallback() {
    // read + clear before we touch innerHTML, textContent is our data source
    const img = this.getAttribute("img") || "";
    const title = this.getAttribute("title") || "";
    const variant = this.getAttribute("variant") === "full" ? "full" : "third";
    const imageX = this.getAttribute("image-x") || "50%";
    const imageY = this.getAttribute("image-y") || "50%";
    const description = this.textContent.trim();

    this.classList.add("project-card", `project-card--${variant}`);
    this.style.setProperty("--project-image-x", imageX);
    this.style.setProperty("--project-image-y", imageY);

    this.innerHTML = `
      <div class="project-card__link">
        <div class="project-card__media">
          <img src="${img}" alt="${title}" loading="lazy" />
        </div>
        <div class="project-card__body">
          <h3 class="project-card__title"><button class="project-card__title-button" type="button">${title}</button></h3>
          <p class="project-card__desc">${description}</p>
        </div>
      </div>
    `;
  }
}

customElements.define("project-card", ProjectCard);
