import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  BoxGeometry,
  InstancedMesh,
  Mesh,
  Group,
  MeshStandardMaterial,
  Object3D,
  AmbientLight,
  DirectionalLight,
  DoubleSide,
  Fog,
  Box3,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const COLOR_GROUND = 0x657254; // olive, campsite grass
const COLOR_BLADE = 0x7c8a63; // slightly lighter olive, for subtle depth against the ground
const COLOR_FOG = 0xe9ddbb; // warm haze — reads as dusk or early-morning light
const COLOR_WOOD = 0x6b4a2f; // frame
const COLOR_SCREEN = 0x2f2b26; // blank inset panel — the future slideshow spot

const BLADE_COUNT = 4500;
const FIELD_WIDTH = 16; // x spread
const FIELD_DEPTH = 14; // z spread

// Frame dimensions (world units)
const FRAME_WIDTH = 3.2;
const FRAME_HEIGHT = 2.1;
const FRAME_BAR = 0.16; // thickness of each wooden plank
const FRAME_DEPTH = 0.12;
const FRAME_Z = -3.4; // how far back into the field it stands

// A simple tapered blade: a plane pinched narrower toward the tip and bent
// slightly forward. Cheap — a handful of vertices, instanced thousands of
// times on the GPU rather than thousands of separate meshes/draw calls.
function createBladeGeometry() {
  const height = 0.22;
  const geometry = new PlaneGeometry(0.05, height, 1, 4);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const t = (y + height / 2) / height; // 0 at base, 1 at tip
    const taper = 1 - t * 0.8;
    position.setX(i, x * taper);
    position.setZ(i, Math.pow(t, 2) * 0.12); // gentle forward bend
  }

  geometry.translate(0, height / 2, 0); // pivot at the base, so it "grows" from y=0
  geometry.computeVertexNormals();
  return geometry;
}

function createGround() {
  const geometry = new PlaneGeometry(FIELD_WIDTH * 1.5, FIELD_DEPTH * 1.5);
  const material = new MeshStandardMaterial({
    color: COLOR_GROUND,
    roughness: 1,
  });
  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, geometry, material };
}

function createGrassField() {
  const geometry = createBladeGeometry();
  const material = new MeshStandardMaterial({
    color: COLOR_BLADE,
    side: DoubleSide,
    roughness: 0.8,
    flatShading: true,
  });

  const mesh = new InstancedMesh(geometry, material, BLADE_COUNT);
  const dummy = new Object3D();

  for (let i = 0; i < BLADE_COUNT; i++) {
    const x = (Math.random() - 0.5) * FIELD_WIDTH;
    const z = (Math.random() - 0.5) * FIELD_DEPTH;
    const scale = 0.7 + Math.random() * 0.6;

    dummy.position.set(x, 0, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.rotation.z = (Math.random() - 0.5) * 0.15;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();

    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, geometry, material };
}

// A static wooden frame — four planks forming a rectangular border, standing
// on the ground, with a dark blank panel inset just behind it. The panel is
// the reserved spot for the slideshow later; for now it's just a flat color.
function createFrame() {
  const woodMaterial = new MeshStandardMaterial({
    color: COLOR_WOOD,
    roughness: 0.9,
    flatShading: true,
  });

  const group = new Group();
  const geometries = [];

  const halfW = FRAME_WIDTH / 2;

  const barSpecs = [
    // [width, height, x, y]  — top, bottom, left, right
    [FRAME_WIDTH, FRAME_BAR, 0, FRAME_HEIGHT - FRAME_BAR / 2],
    [FRAME_WIDTH, FRAME_BAR, 0, FRAME_BAR / 2],
    [FRAME_BAR, FRAME_HEIGHT, -(halfW - FRAME_BAR / 2), FRAME_HEIGHT / 2],
    [FRAME_BAR, FRAME_HEIGHT, halfW - FRAME_BAR / 2, FRAME_HEIGHT / 2],
  ];

  for (const [w, h, x, y] of barSpecs) {
    const geometry = new BoxGeometry(w, h, FRAME_DEPTH);
    geometries.push(geometry);
    const bar = new Mesh(geometry, woodMaterial);
    bar.position.set(x, y, 0);
    group.add(bar);
  }

  // blank inset panel — where the slideshow will render later
  const screenWidth = FRAME_WIDTH - FRAME_BAR * 2;
  const screenHeight = FRAME_HEIGHT - FRAME_BAR * 2;
  const screenGeometry = new PlaneGeometry(screenWidth, screenHeight);
  geometries.push(screenGeometry);
  const screenMaterial = new MeshStandardMaterial({
    color: COLOR_SCREEN,
    roughness: 1,
  });
  const screen = new Mesh(screenGeometry, screenMaterial);
  screen.position.set(0, FRAME_HEIGHT / 2, -FRAME_DEPTH / 2 + 0.01);
  group.add(screen);

  group.position.set(0, 0, FRAME_Z);

  return { group, geometries, materials: [woodMaterial, screenMaterial] };
}

// Your two .glb characters. Put the files in /public/models/, reference
// them here by root-relative path. targetHeight is in world units — the
// same scale the grass (~0.15–0.28 tall) and frame (2.1 tall) use — so
// this is what actually "resizes" the model regardless of how it was
// scaled/exported from Blender.
const CHARACTER_CONFIGS = [
  {
    url: "./public/model/3Ddog.glb",
    x: -1.55,
    z: 2.2,
    rotationY: 2.3,
    targetHeight: 1,
  },
  {
    url: "./public/model/3Dpotatoes.glb",
    x: 0.6,
    z: 2.0,
    rotationY: 0.35,
    targetHeight: 0.45,
  },
];

// Scales a loaded model so its height matches targetHeight, then plants its
// base at y = 0 (ground level) at the given x/z, and applies a facing
// rotation. Works regardless of the model's original export scale/pivot.
function fitAndPlaceModel(model, { x, z, rotationY, targetHeight }) {
  const box = new Box3().setFromObject(model);
  const size = new Vector3();
  box.getSize(size);

  const scale = size.y > 0 ? targetHeight / size.y : 1;
  model.scale.setScalar(scale);

  // recompute after scaling to find how far the base sits below the
  // model's own origin, so we can lift it to rest exactly on the ground
  const scaledBox = new Box3().setFromObject(model);
  model.position.set(x, -scaledBox.min.y, z);
  model.rotation.y = rotationY;
}

function disposeModel(model) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((m) => m.dispose());
    } else {
      child.material?.dispose();
    }
  });
}

// Loads each configured .glb, fits/places it once ready, and adds it to
// the scene. Loading is async and out-of-band — the rest of the scene
// (grass, frame) renders immediately and doesn't wait on this.
function loadCharacters(scene, onModelReady) {
  const loader = new GLTFLoader();
  const loadedModels = [];
  let cancelled = false;

  CHARACTER_CONFIGS.forEach((config) => {
    loader.load(
      config.url,
      (gltf) => {
        if (cancelled) return;
        const model = gltf.scene;
        fitAndPlaceModel(model, config);
        scene.add(model);
        loadedModels.push(model);
        onModelReady();
      },
      undefined,
      (error) => {
        console.error(`Failed to load ${config.url}`, error);
      }
    );
  });

  return {
    cancel() {
      cancelled = true;
    },
    dispose() {
      loadedModels.forEach((model) => {
        scene.remove(model);
        disposeModel(model);
      });
    },
  };
}

export function initHeroScene(container) {
  if (!container) return;

  const scene = new Scene();
  scene.fog = new Fog(COLOR_FOG, 8, 20);

  const camera = new PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.2, 6.5);
  camera.lookAt(0, 0.9, -1.5);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const ground = createGround();
  scene.add(ground.mesh);

  const grass = createGrassField();
  scene.add(grass.mesh);

  const frame = createFrame();
  scene.add(frame.group);

  const characters = loadCharacters(scene, render);

  const ambient = new AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const directional = new DirectionalLight(0xfff2e0, 1.1);
  directional.position.set(3, 5, 4);
  scene.add(directional);

  function render() {
    renderer.render(scene, camera);
  }

  // Static for now — no wind sway or characters yet, those come in later
  // steps. A single render is enough, but resize/visibility handling is
  // already wired up so later steps (animation) can drop straight in.
  render();

  function handleVisibility() {
    if (!document.hidden) render();
  }
  document.addEventListener("visibilitychange", handleVisibility);

  const resizeObserver = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
  });
  resizeObserver.observe(container);

  return function destroy() {
    document.removeEventListener("visibilitychange", handleVisibility);
    resizeObserver.disconnect();
    ground.geometry.dispose();
    ground.material.dispose();
    grass.geometry.dispose();
    grass.material.dispose();
    frame.geometries.forEach((g) => g.dispose());
    frame.materials.forEach((m) => m.dispose());
    characters.cancel();
    characters.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };
}