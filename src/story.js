import "./style.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

const mapContainer = document.getElementById("story-map");
const storySteps = [...document.querySelectorAll(".story-step")];
const STORY_VIEWS = {
  overview: {
    bounds: [
      [35, -12],
      [65, 35],
    ],
    showViennaLabel: true,
  },
  taipei: {
    center: [25.033, 121.5654],
    zoom: 11,
  },
};

if (mapContainer) {
  const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY;
  const tileUrl = cartoKey
    ? `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(
        cartoKey
      )}`
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = cartoKey
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      '&copy; <a href="https://carto.com/attribution/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const map = L.map(mapContainer, {
    zoomControl: false,
    attributionControl: true,
  });

  L.control.zoom({ position: "topright" }).addTo(map);

  L.tileLayer(tileUrl, {
    maxZoom: 20,
    attribution,
  }).addTo(map);

  const viennaLabel = L.marker([48.2082, 16.3738], {
    interactive: false,
    keyboard: false,
    zIndexOffset: 1000,
    icon: L.divIcon({
      className: "story-map-label-icon",
      html: '<div class="story-map-label">Currently located at Vienna, Austria</div>',
      iconSize: null,
      iconAnchor: [0, 10],
    }),
  });

  if (!cartoKey) {
    console.warn(
      "Add VITE_CARTO_BASEMAP_KEY to .env.local to use the CARTO Positron basemap."
    );
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function mapPadding(step) {
    const card = step.querySelector(".story-card");
    const cardRight = card?.getBoundingClientRect().right || 460;

    return window.innerWidth > 700
      ? {
          paddingTopLeft: [Math.min(cardRight + 32, window.innerWidth * 0.62), 40],
          paddingBottomRight: [40, 40],
        }
      : { paddingTopLeft: [24, 24], paddingBottomRight: [24, 220] };
  }

  function showMapView(step, animate = true) {
    storySteps.forEach((storyStep) => {
      storyStep.classList.toggle("is-active", storyStep === step);
    });

    const shouldAnimate = animate && !prefersReducedMotion;
    const view = STORY_VIEWS[step.dataset.mapView];
    if (!view) return;

    if (view.showViennaLabel) {
      if (!map.hasLayer(viennaLabel)) viennaLabel.addTo(map);
    } else if (map.hasLayer(viennaLabel)) {
      viennaLabel.removeFrom(map);
    }

    if (view.bounds) {
      const bounds = L.latLngBounds(view.bounds);
      const options = {
        ...mapPadding(step),
        animate: shouldAnimate,
        duration: 1.4,
      };

      if (shouldAnimate) {
        map.flyToBounds(bounds, options);
      } else {
        map.fitBounds(bounds, options);
      }
      return;
    }

    if (shouldAnimate) {
      map.flyTo(view.center, view.zoom, { duration: 1.4 });
    } else {
      map.setView(view.center, view.zoom);
    }
  }

  const stepObserver = new IntersectionObserver(
    (entries) => {
      const activeEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (activeEntry) showMapView(activeEntry.target);
    },
    {
      rootMargin: "-28% 0px -42% 0px",
      threshold: 0,
    }
  );

  storySteps.forEach((step) => stepObserver.observe(step));
  if (storySteps[0]) showMapView(storySteps[0], false);

  window.addEventListener(
    "pagehide",
    () => {
      stepObserver.disconnect();
      map.remove();
    },
    { once: true }
  );
}
