/**
 * 工程模型树的前端状态。节点用平铺数组 + parentId（邻接表），
 * 与 SQLite 邻接表同构；保存时按数组顺序写 sortOrder。
 */
import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { PersistNode } from "../api/projects";
import { primitiveHeight } from "../core/geometry";
import type {
  GroupNode,
  InstanceNode,
  ModelNode,
  PlaceableShape,
  PrimitiveNode,
  PrimitiveShape,
  Vec3,
} from "../core/types";
import { isPlaceableShape } from "../core/types";

/** 与 conventions.md 一致：`node_` 前缀 + uuid。 */
function newNodeId(): string {
  return `node_${crypto.randomUUID()}`;
}

/** 按已有名称取下一个序号，得到 box_1、box_2、cylinder_1… */
function nextName(nodes: ModelNode[], shape: PlaceableShape): string {
  const prefix = shape;
  let max = 0;
  const re = new RegExp(`^${prefix}_(\\d+)$`);
  for (const node of nodes) {
    const match = node.name.match(re);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `${prefix}_${max + 1}`;
}

/** 新建图元的默认数字尺寸，存库时再转成表达式字符串。 */
const DEFAULT_DIMS: Record<PlaceableShape, Record<string, number>> = {
  box: { x: 200, y: 200, z: 200 },
  cylinder: { radius: 50, height: 200 },
  cone: { radiusBottom: 100, radiusTop: 50, height: 200 },
  sphere: { radius: 100 },
  torus: { radius: 120, tubeRadius: 30 },
};

function stringifyDims(nums: Record<string, number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(nums)) {
    out[key] = String(value);
  }
  return out;
}

/**
 * 新建图元的默认值。
 * - dims 一律存表达式字符串（即使现在只是数字），避免第 11 期参数化返工。
 * - pos.z = 高度/2：几何中心在原点，抬高半高才能「坐」在 Z=0 地面上。
 */
function defaultPrimitive(
  shape: PlaceableShape,
  name: string,
  sortOrder: number,
): PrimitiveNode {
  const nums = DEFAULT_DIMS[shape];
  const height = primitiveHeight(shape, nums);
  return {
    id: newNodeId(),
    name,
    parentId: null,
    sortOrder,
    nodeType: "primitive",
    shape,
    dims: stringifyDims(nums),
    transform: { pos: [0, 0, height / 2], rot: [0, 0, 0] },
  } as PrimitiveNode;
}

function persistToModelNode(node: PersistNode): ModelNode {
  if (node.nodeType === "primitive") {
    if (!node.shape || !isPlaceableShape(node.shape) || !node.dims) {
      throw new Error(`节点 ${node.id} 缺少有效的 shape / dims`);
    }
    return {
      id: node.id,
      name: node.name,
      parentId: node.parentId,
      sortOrder: node.sortOrder,
      nodeType: "primitive",
      shape: node.shape as PrimitiveShape,
      dims: node.dims,
      transform: {
        pos: [...node.transform.pos] as Vec3,
        rot: [...node.transform.rot] as Vec3,
      },
    } as PrimitiveNode;
  }
  if (node.nodeType === "instance") {
    if (!node.templateId || !node.paramValues) {
      throw new Error(`节点 ${node.id} 缺少 templateId / paramValues`);
    }
    const instance: InstanceNode = {
      id: node.id,
      name: node.name,
      parentId: node.parentId,
      sortOrder: node.sortOrder,
      nodeType: "instance",
      templateId: node.templateId,
      paramValues: { ...node.paramValues },
      transform: {
        pos: [...node.transform.pos] as Vec3,
        rot: [...node.transform.rot] as Vec3,
      },
    };
    return instance;
  }
  const group: GroupNode = {
    id: node.id,
    name: node.name,
    parentId: node.parentId,
    sortOrder: node.sortOrder,
    nodeType: "group",
    transform: {
      pos: [...node.transform.pos] as Vec3,
      rot: [...node.transform.rot] as Vec3,
    },
  };
  return group;
}

/** 模型树状态。 */
export const useModelTreeStore = defineStore("modelTree", () => {
  const nodes = ref<ModelNode[]>([]);
  const selectedId = ref<string | null>(null);
  const dirty = ref(false);

  const selectedNode = computed((): ModelNode | null => {
    if (!selectedId.value) return null;
    return nodes.value.find((node) => node.id === selectedId.value) ?? null;
  });

  function markDirty() {
    dirty.value = true;
  }

  function markClean() {
    dirty.value = false;
  }

  /** 清空当前树（切换项目或离开建模页时调用）。 */
  function clear() {
    nodes.value = [];
    selectedId.value = null;
    dirty.value = false;
  }

  /** 用服务端整树替换内存状态；按 sortOrder 排序。 */
  function loadFromServer(payload: PersistNode[]) {
    const sorted = [...payload].sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.value = sorted.map(persistToModelNode);
    selectedId.value = null;
    dirty.value = false;
  }

  /** 创建新图元。 */
  function addPrimitive(shape: PlaceableShape) {
    const node = defaultPrimitive(
      shape,
      nextName(nodes.value, shape),
      nodes.value.length,
    );
    nodes.value.push(node);
    selectedId.value = node.id;
    markDirty();
  }

  /** 选择节点（不视为未保存改动）。 */
  function select(id: string | null) {
    selectedId.value = id;
  }

  /** 更新图元尺寸。 */
  function updateDims(id: string, dims: Record<string, string>) {
    const node = nodes.value.find((item) => item.id === id);
    if (!node || node.nodeType !== "primitive") return;
    const next = node.dims as Record<string, string>;
    for (const [key, value] of Object.entries(dims)) {
      next[key] = value;
    }
    markDirty();
  }

  /** 更新图元位置。 */
  function updatePosition(id: string, pos: Vec3) {
    const node = nodes.value.find((item) => item.id === id);
    if (!node) return;
    node.transform.pos = [pos[0], pos[1], pos[2]];
    markDirty();
  }

  /** 更新图元旋转（角度制，X → Y → Z）。 */
  function updateRotation(id: string, rot: Vec3) {
    const node = nodes.value.find((item) => item.id === id);
    if (!node) return;
    node.transform.rot = [rot[0], rot[1], rot[2]];
    markDirty();
  }

  return {
    nodes,
    selectedId,
    selectedNode,
    dirty,
    addPrimitive,
    select,
    updateDims,
    updatePosition,
    updateRotation,
    loadFromServer,
    clear,
    markClean,
  };
});
