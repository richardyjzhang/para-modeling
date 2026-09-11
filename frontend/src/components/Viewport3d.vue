<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const containerRef = ref<HTMLDivElement | null>(null);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let cubeGeo: THREE.BoxGeometry | null = null;
let cubeMat: THREE.MeshStandardMaterial | null = null;
let gridHelper: THREE.GridHelper | null = null;
let axesHelper: THREE.AxesHelper | null = null;
let rafId = 0;
let resizeObserver: ResizeObserver | null = null;

function syncSize() {
  const el = containerRef.value;
  if (!el || !renderer || !camera) return;
  const width = el.clientWidth;
  const height = el.clientHeight;
  if (width === 0 || height === 0) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  rafId = requestAnimationFrame(animate);
  // 阻尼需要每帧调用 update，否则旋转/平移会"卡住"
  controls?.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    for (const item of material) item.dispose();
  } else {
    material.dispose();
  }
}

onMounted(() => {
  const el = containerRef.value;
  if (!el) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1f5f9);

  // near/far 按毫米尺度：场景约数千 mm，far 给到 100m 量级以免裁切
  camera = new THREE.PerspectiveCamera(50, 1, 1, 100000);
  // 工程约定右手系 Z 向上；Three.js 默认 Y-up。
  // 只改相机 up 向量 + 把网格转到 XY，不做全局坐标变换，后续图元直接按 Z-up 摆。
  camera.up.set(0, 0, 1);
  camera.position.set(800, -800, 600);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  // 高 DPR 屏按 2 封顶，避免 3x/4x 像素把 GPU 打满
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.display = "block";
  el.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  // 斜上方打光，让立方体各面有明暗区分
  dirLight.position.set(400, -600, 800);
  scene.add(dirLight);

  // GridHelper 默认躺在 XZ（Y=0）；绕 X 转 90° 落到工程地面 XY（Z=0）
  gridHelper = new THREE.GridHelper(2000, 20, 0x94a3b8, 0xcbd5e1);
  gridHelper.rotateX(Math.PI / 2);
  scene.add(gridHelper);

  axesHelper = new THREE.AxesHelper(400);
  scene.add(axesHelper);

  cubeGeo = new THREE.BoxGeometry(200, 200, 200);
  cubeMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    metalness: 0.1,
    roughness: 0.6,
  });
  const cube = new THREE.Mesh(cubeGeo, cubeMat);
  cube.position.set(0, 0, 100);
  scene.add(cube);

  syncSize();
  resizeObserver = new ResizeObserver(syncSize);
  resizeObserver.observe(el);
  animate();
});

onUnmounted(() => {
  // Vue 热更新 / 路由切换会反复挂载，不释放 WebGL 资源会泄漏上下文
  cancelAnimationFrame(rafId);
  resizeObserver?.disconnect();
  resizeObserver = null;

  controls?.dispose();
  controls = null;

  cubeGeo?.dispose();
  cubeMat?.dispose();
  cubeGeo = null;
  cubeMat = null;

  if (gridHelper) {
    gridHelper.geometry.dispose();
    disposeMaterial(gridHelper.material);
    gridHelper = null;
  }
  if (axesHelper) {
    axesHelper.geometry.dispose();
    disposeMaterial(axesHelper.material);
    axesHelper = null;
  }

  renderer?.dispose();
  renderer?.domElement.remove();
  renderer = null;
  scene = null;
  camera = null;
});
</script>

<template>
  <div ref="containerRef" class="h-full w-full overflow-hidden" />
</template>
