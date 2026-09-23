import "./style.css";
import { initHeroScene } from "./hero-scene.js";

// Entry point. Kept intentionally minimal at this stage —
// project cards and page content get added in later steps.

const navToggle = document.getElementById("nav-toggle");
const mainNav = document.getElementById("main-nav");

navToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

// Close mobile nav when a link is clicked
mainNav?.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    mainNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

initHeroScene(document.getElementById("hero-scene"));