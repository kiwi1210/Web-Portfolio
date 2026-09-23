import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  IcosahedronGeometry,
  MeshStandardMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
  Color,
} from "three";

const COLOR_HIGHLIGHT = 0xecb390;
const COLOR_SUB_2 = 0x94b49f;

export function initHeroScene(container) {
  if (!container) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const scene = new Scene();

  const camera = new PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 6);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // low-poly icosahedron — cheap to render, fits the flat/graphic palette
  const geometry = new IcosahedronGeometry(2, 0);
  const material = new MeshStandardMaterial({
    color: COLOR_HIGHLIGHT,
    flatShading: true,
    roughness: 0.5,
    metalness: 0.1,
  });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  const ambient = new AmbientLight(new Color(COLOR_SUB_2), 0.6);
  scene.add(ambient);

  const directional = new DirectionalLight(0xffffff, 1.2);
  directional.position.set(3, 4, 5);
  scene.add(directional);

  function render() {
    renderer.render(scene, camera);
  }

  let frameId = null;

  function animate() {
    mesh.rotation.x += 0.003;
    mesh.rotation.y += 0.004;
    render();
    frameId = requestAnimationFrame(animate);
  }

  if (prefersReducedMotion) {
    render();
  } else {
    animate();
  }

  // pause rendering when tab is hidden
  function handleVisibility() {
    if (document.hidden) {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    } else if (!prefersReducedMotion && frameId === null) {
      animate();
    }
  }
  document.addEventListener("visibilitychange", handleVisibility);

  // keep the scene sized to its container as the hero grid reflows
  const resizeObserver = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (prefersReducedMotion) render();
  });
  resizeObserver.observe(container);

  return function destroy() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    document.removeEventListener("visibilitychange", handleVisibility);
    resizeObserver.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };
}