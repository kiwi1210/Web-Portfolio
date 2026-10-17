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
    center: [48, -3.5],
    zoom: 5,
    showViennaLocation: true,
  },
  taipei: {
    center: [25.06, 121.4054],
    zoom: 11,
  },
  europe: {
    center: [49.3, 11],
    zoom: 6,
  },
  "vienna-work": {
    center: [48.2276, 16.3669],
    zoom: 13,
  },
};

const TAIPEI_STOPS = [
  { position: [24.9874, 121.576], icon: "/icon/college.svg", label: "University" },
  { position: [25.04, 121.6137], icon: "/icon/suitcase.svg", label: "Work Experience" },
  { position: [24.9837, 121.5414], icon: "/icon/suitcase.svg", label: "Work Experience" },
  { position: [24.9874, 121.576], icon: "/icon/library.svg", label: "Research Experience" },
  { position: [25.0084, 121.4805], icon: "/icon/suitcase.svg", label: "Work Experience" },
];

const EUROPE_STOPS = [
  { position: [48.1491, 11.5687], city: "Munich" },
  { position: [48.1991, 16.37], city: "Vienna" },
  { position: [51.02856, 13.731], city: "Dresden" },
];

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

  const viennaMarker = L.marker([48.2082, 16.3738], {
    interactive: false,
    keyboard: false,
    zIndexOffset: 1000,
    icon: L.divIcon({
      className: "story-location-pin-icon",
      html: '<span class="story-location-pin" aria-hidden="true"></span>',
      iconSize: [24, 32],
      iconAnchor: [4, 25],
    }),
  });

  const locationLegend = L.control({ position: "bottomright" });
  locationLegend.onAdd = () => {
    const legend = L.DomUtil.create("div", "story-map-legend");
    legend.innerHTML =
      '<span class="story-location-pin story-location-pin--legend" aria-hidden="true"></span>' +
      '<span>currently located</span>';
    return legend;
  };
  let locationLegendVisible = false;
  let activeMapView = "overview";
  let taipeiBoundary;

  const taipeiMarkers = TAIPEI_STOPS.map((stop, index) =>
    L.marker(stop.position, {
      keyboard: false,
      zIndexOffset: 100 + index,
      icon: L.divIcon({
        className: "story-taipei-marker-icon",
        html:
          `<span class="story-taipei-marker" data-stop="${index}">` +
          `<img src="${stop.icon}" alt="" aria-hidden="true" />` +
          "</span>",
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      }),
    })
  );

  const taipeiLabel = L.control({ position: "bottomright" });
  taipeiLabel.onAdd = () => {
    const label = L.DomUtil.create("div", "story-taipei-label");
    label.innerHTML =
      '<span class="story-taipei-label__icon" aria-hidden="true"></span>' +
      '<span class="story-taipei-label__text"></span>';
    return label;
  };
  let taipeiLabelVisible = false;

  function showTaipeiStops(activeStop, labelText) {
    taipeiMarkers.forEach((marker, index) => {
      if (!map.hasLayer(marker)) marker.addTo(map);

      const markerElement = marker.getElement()?.querySelector(".story-taipei-marker");
      const isActive = index === activeStop;
      markerElement?.classList.toggle("is-active", isActive);
      marker.setZIndexOffset(isActive ? 2000 : 100 + index);
    });

    if (!taipeiLabelVisible) {
      taipeiLabel.addTo(map);
      taipeiLabelVisible = true;
    }

    const activeStopData = TAIPEI_STOPS[activeStop];
    const label = taipeiLabel.getContainer();
    const icon = label?.querySelector(".story-taipei-label__icon");
    const text = label?.querySelector(".story-taipei-label__text");
    if (icon && activeStopData) {
      icon.style.backgroundImage = `url("${activeStopData.icon}")`;
    }
    if (text) text.textContent = labelText || activeStopData?.label || "Story location";
  }

  function hideTaipeiStops() {
    taipeiMarkers.forEach((marker) => {
      if (map.hasLayer(marker)) marker.removeFrom(map);
    });

    if (taipeiLabelVisible) {
      taipeiLabel.remove();
      taipeiLabelVisible = false;
    }
  }

  const europeMarkers = EUROPE_STOPS.map((stop) =>
    L.marker(stop.position, {
      keyboard: false,
      zIndexOffset: 1200,
      icon: L.divIcon({
        className: "story-europe-marker-icon",
        html:
          '<span class="story-europe-marker">' +
          '<img src="/icon/college.svg" alt="" aria-hidden="true" />' +
          "</span>",
        iconSize: [31, 31],
        iconAnchor: [21, 21],
      }),
    })
  );

  function curvedRoute(start, end, bend = 0.18) {
    const midpoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const control = [
      midpoint[0] + (end[1] - start[1]) * bend,
      midpoint[1] - (end[0] - start[0]) * bend,
    ];
    const points = [];

    for (let index = 0; index <= 28; index += 1) {
      const t = index / 28;
      const inverse = 1 - t;
      points.push([
        inverse * inverse * start[0] + 2 * inverse * t * control[0] + t * t * end[0],
        inverse * inverse * start[1] + 2 * inverse * t * control[1] + t * t * end[1],
      ]);
    }

    return points;
  }

  function routeArrow(points) {
    const arrowIndex = Math.floor(points.length * 0.78);
    const previous = points[arrowIndex - 1];
    const next = points[arrowIndex + 1];
    const angle = Math.atan2(-(next[0] - previous[0]), next[1] - previous[1]) * (180 / Math.PI);

    return L.marker(points[arrowIndex], {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        className: "story-europe-arrow-icon",
        html: `<span style="transform: rotate(${angle}deg)">➤</span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    });
  }

  const europeRoutes = [
    curvedRoute(EUROPE_STOPS[0].position, EUROPE_STOPS[1].position, 0.13),
    curvedRoute(EUROPE_STOPS[1].position, EUROPE_STOPS[2].position, -0.13),
  ];
  const europeJourneyLayer = L.layerGroup([
    ...europeRoutes.map((route) =>
      L.polyline(route, {
        className: "story-europe-route",
        color: "#d84404",
        weight: 2.5,
        opacity: 0.82,
        lineCap: "round",
        lineJoin: "round",
      })
    ),
    ...europeRoutes.map(routeArrow),
    ...europeMarkers,
  ]);

  const europeLabel = L.control({ position: "bottomright" });
  europeLabel.onAdd = () => {
    const label = L.DomUtil.create("div", "story-taipei-label story-europe-label");
    label.innerHTML =
      '<span class="story-taipei-label__icon story-europe-label__icon" aria-hidden="true"></span>' +
      '<span>University</span>';
    return label;
  };
  let europeLabelVisible = false;

  function showEuropeJourney() {
    if (!map.hasLayer(europeJourneyLayer)) europeJourneyLayer.addTo(map);
    if (!europeLabelVisible) {
      europeLabel.addTo(map);
      europeLabelVisible = true;
    }
  }

  function hideEuropeJourney() {
    if (map.hasLayer(europeJourneyLayer)) europeJourneyLayer.removeFrom(map);
    if (europeLabelVisible) {
      europeLabel.remove();
      europeLabelVisible = false;
    }
  }

  const viennaWorkMarker = L.marker([48.2336, 16.4119], {
    keyboard: false,
    zIndexOffset: 1400,
    icon: L.divIcon({
      className: "story-europe-marker-icon",
      html:
        '<span class="story-europe-marker">' +
        '<img src="/icon/suitcase.svg" alt="" aria-hidden="true" />' +
        "</span>",
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    }),
  });

  const viennaWorkLabel = L.control({ position: "bottomright" });
  viennaWorkLabel.onAdd = () => {
    const label = L.DomUtil.create("div", "story-taipei-label story-vienna-work-label");
    label.innerHTML =
      '<span class="story-taipei-label__icon story-vienna-work-label__icon" aria-hidden="true"></span>' +
      '<span>Work Experience</span>';
    return label;
  };
  let viennaWorkVisible = false;

  function showViennaWork() {
    if (!map.hasLayer(viennaWorkMarker)) viennaWorkMarker.addTo(map);
    if (!viennaWorkVisible) {
      viennaWorkLabel.addTo(map);
      viennaWorkVisible = true;
    }
  }

  function hideViennaWork() {
    if (map.hasLayer(viennaWorkMarker)) viennaWorkMarker.removeFrom(map);
    if (viennaWorkVisible) {
      viennaWorkLabel.remove();
      viennaWorkVisible = false;
    }
  }

  fetch("/spatial/Taipei_wgs84.geojson")
    .then((response) => {
      if (!response.ok) throw new Error(`GeoJSON request failed: ${response.status}`);
      return response.json();
    })
    .then((geojson) => {
      taipeiBoundary = L.geoJSON(geojson, {
        style: {
          className: "story-taipei-boundary",
          weight: 1.5,
          opacity: 0.7,
          fill: false,
          fillOpacity: 0,
        },
      });

      if (activeMapView === "taipei") taipeiBoundary.addTo(map);
    })
    .catch((error) => {
      console.error("Failed to load the Taipei boundary", error);
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
    activeMapView = step.dataset.mapView;
    const view = STORY_VIEWS[activeMapView];
    if (!view) return;
    const taipeiStop = Number(step.dataset.taipeiStop);
    const zoom =
      activeMapView === "taipei" && taipeiStop > 0 ? view.zoom + 1 : view.zoom;
    const center =
      activeMapView === "taipei" && taipeiStop > 0
        ? [view.center[0] - 0.045, view.center[1] +0.09]
        : view.center;

    if (activeMapView === "taipei") {
      showTaipeiStops(taipeiStop, step.dataset.mapLabel);
    } else {
      hideTaipeiStops();
    }

    if (activeMapView === "europe") {
      showEuropeJourney();
    } else {
      hideEuropeJourney();
    }

    if (activeMapView === "vienna-work") {
      showViennaWork();
    } else {
      hideViennaWork();
    }

    if (taipeiBoundary) {
      if (activeMapView === "taipei") {
        if (!map.hasLayer(taipeiBoundary)) taipeiBoundary.addTo(map);
      } else if (map.hasLayer(taipeiBoundary)) {
        taipeiBoundary.removeFrom(map);
      }
    }

    if (view.showViennaLocation) {
      if (!map.hasLayer(viennaMarker)) viennaMarker.addTo(map);
      if (!locationLegendVisible) {
        locationLegend.addTo(map);
        locationLegendVisible = true;
      }
    } else {
      if (map.hasLayer(viennaMarker)) viennaMarker.removeFrom(map);
      if (locationLegendVisible) {
        locationLegend.remove();
        locationLegendVisible = false;
      }
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
      map.flyTo(center, zoom, { duration: 1.4 });
    } else {
      map.setView(center, zoom);
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
