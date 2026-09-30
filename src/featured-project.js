// <project-card>
// Light-DOM custom element (no shadow root) — it inherits fonts/colors
// straight from style.css, no style duplication needed.
//
// Attributes:
//   img       - image src
//   title     - project title
//   href      - link target (defaults to "#")
//   variant   - "primary" (large, image 60 / text 40) or omitted (default card)
//
// Description text is taken from the element's own text content, e.g.:
//   <project-card img="..." title="..." variant="primary">
//     Short description here.
//   </project-card>

class ProjectCard extends HTMLElement {
  connectedCallback() {
    // read + clear before we touch innerHTML, textContent is our data source
    const img = this.getAttribute("img") || "";
    const title = this.getAttribute("title") || "";
    const href = this.getAttribute("href") || "#";
    const variant = this.getAttribute("variant") || "default";
    const description = this.textContent.trim();

    this.classList.add("project-card", `project-card--${variant}`);

    this.innerHTML = `
      <a class="project-card__link" href="${href}">
        <div class="project-card__media">
          <img src="${img}" alt="${title}" loading="lazy" />
        </div>
        <div class="project-card__body">
          <h3 class="project-card__title">${title}</h3>
          <p class="project-card__desc">${description}</p>
        </div>
      </a>
    `;
  }
}

customElements.define("project-card", ProjectCard);