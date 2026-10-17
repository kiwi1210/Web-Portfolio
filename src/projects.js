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
}
