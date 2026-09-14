<template>
  <div ref="containerRef" class="h-full w-full overflow-hidden" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { storeToRefs } from "pinia";
import {
  createPrimitiveGeometry,
  evaluatePrimitiveDims,
} from "../core/geometry";
import { isPrimitiveNode, type ModelNode, type Transform } from "../core/types";
import { useModelTreeStore } from "../stores/modelTree";

const containerRef = ref<HTMLDivElement | null>(null);
const store = useModelTreeStore();
const { nodes } = storeToRefs(store);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let gridHelper: THREE.GridHelper | null = null;
let axesHelper: THREE.AxesHelper | null = null;
let modelRoot: THREE.Group | null = null;
let rafId = 0;
let resizeObserver: ResizeObserver | null = null;

/** 临时指定的图元颜色 */
const MESH_COLORS: Record<string, number> = {
  box: 0x3b82f6,
  cylinder: 0x10b981,
  cone: 0xf59e0b,
  sphere: 0x8b5cf6,
  torus: 0x06b6d4,
};

/** 节点自定义颜色格式："#" + 6 位十六进制（与 conventions.md §3.2 一致）。 */
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** 取节点渲染色：color 合法用 color，否则退回图元类型默认色。 */
function meshColor(node: {
  color: string | null;
  shape: string;
}): THREE.ColorRepresentation {
  if (node.color && HEX_COLOR_RE.test(node.color)) {
    return node.color;
  }
  return MESH_COLORS[node.shape] ?? 0x64748b;
}

/** 同步容器尺寸到相机 */
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

/** 动画帧渲染 */
function animate() {
  rafId = requestAnimationFrame(animate);
  // 阻尼需要每帧调用 update，否则旋转/平移会"卡住"
  controls?.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

/** 释放材质资源 */
function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    for (const item of material) item.dispose();
  } else {
    material.dispose();
  }
}

/** 释放对象树里所有 Mesh 的 geometry / material。 */
function disposeObject3d(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      disposeMaterial(child.material);
    }
  });
}

/** 清空模型根节点（含子级 THREE.Group）。 */
function clearModelRoot() {
  if (!modelRoot) return;
  const children = [...modelRoot.children];
  for (const child of children) {
    modelRoot.remove(child);
    disposeObject3d(child);
  }
}

/** 把工程侧 transform（角度制、相对父级）施加到 Three 对象上。 */
function applyTransform(object: THREE.Object3D, transform: Transform) {
  object.position.set(transform.pos[0], transform.pos[1], transform.pos[2]);
  object.rotation.order = "XYZ";
  object.rotation.set(
    THREE.MathUtils.degToRad(transform.rot[0]),
    THREE.MathUtils.degToRad(transform.rot[1]),
    THREE.MathUtils.degToRad(transform.rot[2]),
  );
}

function buildPrimitiveMesh(node: ModelNode): THREE.Mesh | null {
  if (!isPrimitiveNode(node)) return null;
  const evalResult = evaluatePrimitiveDims(node);
  if (!evalResult.ok) {
    console.warn(`跳过节点 ${node.name}：${evalResult.message}`);
    return null;
  }
  const geometry = createPrimitiveGeometry(node.shape, evalResult.values);
  const material = new THREE.MeshStandardMaterial({
    color: meshColor(node),
    metalness: 0.1,
    roughness: 0.6,
  });
  const mesh = new THREE.Mesh(geometry, material);
  applyTransform(mesh, node.transform);
  mesh.userData.nodeId = node.id;
  return mesh;
}

/** 按 parentId 递归建 THREE.Group / Mesh，子节点坐标相对父分组。 */
function buildNode(node: ModelNode, parent: THREE.Object3D) {
  if (node.nodeType === "group") {
    const group = new THREE.Group();
    applyTransform(group, node.transform);
    group.userData.nodeId = node.id;
    parent.add(group);
    for (const child of store.childrenOf(node.id)) {
      buildNode(child, group);
    }
    return;
  }
  const mesh = buildPrimitiveMesh(node);
  if (mesh) parent.add(mesh);
}

/** 重建图元网格 */
function rebuildMeshes() {
  if (!modelRoot) return;
  clearModelRoot();
  for (const node of store.childrenOf(null)) {
    buildNode(node, modelRoot);
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
  dirLight.position.set(400, -600, 800);
  scene.add(dirLight);

  // GridHelper 默认躺在 XZ（Y=0）；绕 X 转 90° 落到工程地面 XY（Z=0）
  gridHelper = new THREE.GridHelper(2000, 20, 0x94a3b8, 0xcbd5e1);
  gridHelper.rotateX(Math.PI / 2);
  scene.add(gridHelper);

  axesHelper = new THREE.AxesHelper(400);
  scene.add(axesHelper);

  modelRoot = new THREE.Group();
  scene.add(modelRoot);
  rebuildMeshes();

  syncSize();
  resizeObserver = new ResizeObserver(syncSize);
  resizeObserver.observe(el);
  animate();
});

/** 监听节点变化，重建图元网格 */
watch(nodes, rebuildMeshes, { deep: true });

onUnmounted(() => {
  // Vue 热更新 / 路由切换会反复挂载，不释放 WebGL 资源会泄漏上下文
  cancelAnimationFrame(rafId);
  resizeObserver?.disconnect();
  resizeObserver = null;

  controls?.dispose();
  controls = null;

  clearModelRoot();
  modelRoot = null;

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
