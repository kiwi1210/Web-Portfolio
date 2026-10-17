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
  PointLight,
  DoubleSide,
  Fog,
  Box3,
  Vector3,
  VideoTexture,
  CanvasTexture,
  MeshBasicMaterial,
  SRGBColorSpace,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const COLOR_GROUND = 0x696c2a; // campsite grass
const COLOR_BLADE = 0x696c2a;
const COLOR_FOG = 0x26333a; // cool evening haze
const COLOR_WOOD = 0x6b4a2f; // frame
const COLOR_SCREEN = 0xb6b2af; // blank inset panel — the future slideshow spot

const SLIDESHOW_VIDEOS = [
  { url: "./slidesshow/UTCIviz.mp4", caption: "3D Visualization" },
  { url: "./slidesshow/Japanese.mp4", caption: "Printed Map" },
  { url: "./slidesshow/SA.mp4", caption: "Interactive Maps" },
];
const SLIDE_DURATION = 6000;
const PROJECTOR_SIDE_MATTE = 0.1;

const BLADE_COUNT = 4500;
const FIELD_WIDTH = 16; // x spread
const FIELD_DEPTH = 14; // z spread

// Frame dimensions (world units)
const FRAME_WIDTH = 6.8;
const FRAME_HEIGHT = 4.1;
const FRAME_BAR = 0.008; // thickness of each wooden plank
const FRAME_DEPTH = 0.22;
const FRAME_Z = -3.7; // how far back into the field it stands

// A simple tapered blade: a plane pinched narrower toward the tip and bent
// slightly forward. Cheap — a handful of vertices, instanced thousands of
// times on the GPU rather than thousands of separate meshes/draw calls.
function createBladeGeometry() {
  const height = 0.22;
  const geometry = new PlaneGeometry(0.05, height, 1, 3);
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

// A static wooden frame with a projector screen inset behind it.
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

  // inset panel where the slideshow is rendered
  const screenWidth = FRAME_WIDTH - FRAME_BAR * 2;
  const screenHeight = FRAME_HEIGHT - FRAME_BAR * 2;

  const backingGeometry = new PlaneGeometry(screenWidth, screenHeight);
  geometries.push(backingGeometry);
  const backingMaterial = new MeshStandardMaterial({
    color: 0x000000,
    roughness: 1,
  });
  const backing = new Mesh(backingGeometry, backingMaterial);
  backing.position.set(0, FRAME_HEIGHT / 2, -FRAME_DEPTH / 2);
  group.add(backing);

  const projectionWidth = screenWidth * (1 - PROJECTOR_SIDE_MATTE * 2);
  const screenGeometry = new PlaneGeometry(projectionWidth, screenHeight);
  geometries.push(screenGeometry);
  const screenMaterial = new MeshStandardMaterial({
    color: COLOR_SCREEN,
    roughness: 1,
    emissive: 0xffffff,
    emissiveIntensity: 0,
  });
  const screen = new Mesh(screenGeometry, screenMaterial);
  screen.position.set(0, FRAME_HEIGHT / 2, -FRAME_DEPTH / 2 + 0.01);
  group.add(screen);

  const captionCanvas = document.createElement("canvas");
  captionCanvas.width = 1024;
  captionCanvas.height = Math.round(
    captionCanvas.width * (screenHeight / projectionWidth)
  );
  const captionContext = captionCanvas.getContext("2d");
  const captionTexture = new CanvasTexture(captionCanvas);
  captionTexture.colorSpace = SRGBColorSpace;

  const captionMaterial = new MeshBasicMaterial({
    map: captionTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const captionGeometry = new PlaneGeometry(projectionWidth, screenHeight);
  geometries.push(captionGeometry);
  const caption = new Mesh(captionGeometry, captionMaterial);
  caption.position.set(0, FRAME_HEIGHT / 2, -FRAME_DEPTH / 2 + 0.02);
  caption.renderOrder = 1;
  group.add(caption);

  function setCaption(text) {
    captionContext.clearRect(0, 0, captionCanvas.width, captionCanvas.height);
    captionContext.font = `600 ${Math.round(
      captionCanvas.height * 0.045
    )}px Roboto, sans-serif`;
    captionContext.textAlign = "center";
    captionContext.textBaseline = "middle";
    captionContext.fillStyle = "#f2d45c"; //#f2d455c
    captionContext.shadowColor = "rgba(0, 0, 0, 0)";
    captionContext.shadowBlur = 1;
    captionContext.shadowOffsetY = 5;
    captionContext.strokeStyle = "#000000";
    captionContext.lineWidth = 5;
    captionContext.lineJoin = "round";
    captionContext.strokeText(
      text,
      captionCanvas.width / 2,
      captionCanvas.height * 0.9
    );
    captionContext.fillText(
      text,
      captionCanvas.width / 2,
      captionCanvas.height * 0.9
    );
    captionTexture.needsUpdate = true;
  }

  const projectorLight = new PointLight(0xffd7b0, 0, 5.5, 2);
  projectorLight.position.set(0, FRAME_HEIGHT / 2, 0.5);
  group.add(projectorLight);

  group.position.set(0, 0, FRAME_Z);

  return {
    group,
    geometries,
    materials: [
      woodMaterial,
      backingMaterial,
      screenMaterial,
      captionMaterial,
    ],
    textures: [captionTexture],
    screenMaterial,
    projectorLight,
    setCaption,
  };
}

function createSlideshow(screenMaterial, projectorLight, setCaption) {
  const video = document.createElement("video");
  video.muted = true; // required for autoplay
  video.playsInline = true;
  video.preload = "auto";

  const texture = new VideoTexture(video);
  texture.colorSpace = SRGBColorSpace;

  screenMaterial.color.set(0xffffff);
  screenMaterial.map = texture;
  screenMaterial.emissiveMap = texture;
  screenMaterial.needsUpdate = true;

  let index = 0;
  let failures = 0;
  let disposed = false;

  function play(i) {
    if (disposed || failures >= SLIDESHOW_VIDEOS.length) return;
    index = i % SLIDESHOW_VIDEOS.length;
    const slide = SLIDESHOW_VIDEOS[index];
    video.src = slide.url;
    setCaption(slide.caption);
    video
      .play()
      .then(() => {
        failures = 0;
        screenMaterial.emissiveIntensity = 0.42;
        projectorLight.intensity = 1.4;
      })
      .catch((error) => console.error("Slideshow play failed", error));
  }

  const onEnded = () => play(index + 1);
  const onError = () => {
    failures++;
    console.error(`Failed to load ${SLIDESHOW_VIDEOS[index].url}`);
    play(index + 1);
  };
  video.addEventListener("ended", onEnded);
  video.addEventListener("error", onError);

  play(0);

  return {
    update() {}, // VideoTexture refreshes itself each frame
    dispose() {
      disposed = true;
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
      texture.dispose();
    },
  };
}



// Your two .glb characters. Put the files in /public/models/, reference
// them here by root-relative path. targetHeight is in world units — the
// same scale the grass (~0.15–0.28 tall) and frame (2.1 tall) use — so
// this is what actually "resizes" the model regardless of how it was
// scaled/exported from Blender.
const CHARACTER_CONFIGS = [
  {
    url: "./model/3Ddog.glb",
    x: -1.55,
    z: 2.2,
    rotationY: 2.3,
    targetHeight: 1,
  },
  {
    url: "./model/3Dpotatoes.glb",
    x: 0.6,
    z: 2.0,
    rotationY: 1.85,
    targetHeight: 0.75,
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

  const initialWidth = container.clientWidth;
  const initialHeight = container.clientHeight;

  const scene = new Scene();
  scene.fog = new Fog(COLOR_FOG, 8, 20);

  const camera = new PerspectiveCamera(
    45,
    initialWidth / initialHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.2, 6.5);
  camera.lookAt(0, 1.25, -1.5);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(initialWidth, initialHeight, false);
  renderer.domElement.classList.add("hero__canvas");
  container.appendChild(renderer.domElement);

  const ground = createGround();
  scene.add(ground.mesh);

  const grass = createGrassField();
  scene.add(grass.mesh);

  const frame = createFrame();
  scene.add(frame.group);

  const slideshow = createSlideshow(
    frame.screenMaterial,
    frame.projectorLight,
    frame.setCaption
  );

  const characters = loadCharacters(scene, () => {});

  const ambient = new AmbientLight(0x71809a, 0.3);
  scene.add(ambient);

  const directional = new DirectionalLight(0xe79a72, 0.48);
  directional.position.set(3, 5, 4);
  scene.add(directional);

  let animationFrame;

  function render() {
    slideshow.update();
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(render);
  }

  render();

  function handleVisibility() {
    if (document.hidden) {
      window.cancelAnimationFrame(animationFrame);
    } else {
      render();
    }
  }
  document.addEventListener("visibilitychange", handleVisibility);

  let resizeFrame;
  let renderedWidth = initialWidth;
  let renderedHeight = initialHeight;

  function syncSize() {
    resizeFrame = undefined;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (width === renderedWidth && height === renderedHeight) return;

    renderedWidth = width;
    renderedHeight = height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function scheduleResize() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(syncSize);
  }

  const resizeObserver = new ResizeObserver(scheduleResize);
  resizeObserver.observe(container);
  window.addEventListener("resize", scheduleResize, { passive: true });

  return function destroy() {
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("resize", scheduleResize);
    resizeObserver.disconnect();
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    window.cancelAnimationFrame(animationFrame);
    slideshow.dispose();
    ground.geometry.dispose();
    ground.material.dispose();
    grass.geometry.dispose();
    grass.material.dispose();
    frame.geometries.forEach((g) => g.dispose());
    frame.materials.forEach((m) => m.dispose());
    frame.textures.forEach((texture) => texture.dispose());
    characters.cancel();
    characters.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };
}
