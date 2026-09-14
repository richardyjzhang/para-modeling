/**
 * 工程模型树的前端状态。节点用平铺数组 + parentId（邻接表），
 * 与 SQLite 邻接表同构；同级 sortOrder 从 0 起单独编号。
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

/** 按已有名称取下一个序号，得到 box_1、group_2… */
function nextName(nodes: ModelNode[], prefix: string): string {
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

/* 将数字尺寸转换为表达式字符串。 */
function stringifyDims(nums: Record<string, number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(nums)) {
    out[key] = String(value);
  }
  return out;
}

/* 克隆节点 transform。 */
function cloneTransform(node: ModelNode): { pos: Vec3; rot: Vec3 } {
  return {
    pos: [...node.transform.pos] as Vec3,
    rot: [...node.transform.rot] as Vec3,
  };
}

/**
 * 新建图元的默认值。
 * - dims 一律存表达式字符串（即使现在只是数字），避免第 11 期参数化返工。
 * - pos.z = 高度/2：几何中心在原点，抬高半高才能「坐」在父级局部 Z=0 平面上。
 */
function defaultPrimitive(
  shape: PlaceableShape,
  name: string,
  parentId: string | null,
  sortOrder: number,
): PrimitiveNode {
  const nums = DEFAULT_DIMS[shape];
  const height = primitiveHeight(shape, nums);
  return {
    id: newNodeId(),
    name,
    parentId,
    sortOrder,
    nodeType: "primitive",
    shape,
    dims: stringifyDims(nums),
    transform: { pos: [0, 0, height / 2], rot: [0, 0, 0] },
    color: null,
  } as PrimitiveNode;
}

/* 新建分组的默认值。 */
function defaultGroup(
  name: string,
  parentId: string | null,
  sortOrder: number,
): GroupNode {
  return {
    id: newNodeId(),
    name,
    parentId,
    sortOrder,
    nodeType: "group",
    transform: { pos: [0, 0, 0], rot: [0, 0, 0] },
    color: null,
  };
}

/* 反序列化持久化节点为模型节点。 */
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
      color: node.color ?? null,
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
      color: node.color ?? null,
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
    color: node.color ?? null,
  };
  return group;
}

/* 拷贝节点。 */
function cloneNode(
  node: ModelNode,
  newId: string,
  newParentId: string | null,
  newName: string,
): ModelNode {
  const transform = cloneTransform(node);
  if (node.nodeType === "primitive") {
    return {
      ...node,
      id: newId,
      parentId: newParentId,
      name: newName,
      dims: { ...node.dims },
      transform,
    } as PrimitiveNode;
  }
  if (node.nodeType === "instance") {
    return {
      ...node,
      id: newId,
      parentId: newParentId,
      name: newName,
      paramValues: { ...node.paramValues },
      transform,
    };
  }
  return {
    ...node,
    id: newId,
    parentId: newParentId,
    name: newName,
    transform,
  };
}

/** 模型树状态。 */
export const useModelTreeStore = defineStore("modelTree", () => {
  const nodes = ref<ModelNode[]>([]);
  const selectedId = ref<string | null>(null);
  const dirty = ref(false);
  /** 正在拖拽的节点 id；dragover 阶段读不到 dataTransfer 内容，所以放 store。 */
  const draggingId = ref<string | null>(null);

  const selectedNode = computed((): ModelNode | null => {
    if (!selectedId.value) return null;
    return nodes.value.find((node) => node.id === selectedId.value) ?? null;
  });

  /* 标记当前状态为脏。 */
  function markDirty() {
    dirty.value = true;
  }

  /* 标记当前状态为干净。 */
  function markClean() {
    dirty.value = false;
  }

  /** 清空当前树（切换项目或离开建模页时调用）。 */
  function clear() {
    nodes.value = [];
    selectedId.value = null;
    draggingId.value = null;
    dirty.value = false;
  }

  /** 用服务端整树替换内存状态。树组件按 childrenOf 再按同级 sortOrder 排。 */
  function loadFromServer(payload: PersistNode[]) {
    nodes.value = payload.map(persistToModelNode);
    selectedId.value = null;
    dirty.value = false;
  }

  /** 直接子节点，按同级 sortOrder 排序。 */
  function childrenOf(parentId: string | null): ModelNode[] {
    return nodes.value
      .filter((node) => node.parentId === parentId)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /** 不含自身的全部后代 id。 */
  function descendantIds(id: string): string[] {
    const result: string[] = [];
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const node of nodes.value) {
        if (node.parentId === current) {
          result.push(node.id);
          queue.push(node.id);
        }
      }
    }
    return result;
  }

  /* 重新索引同级节点的 sortOrder。 */
  function reindexSiblings(parentId: string | null) {
    const siblings = childrenOf(parentId);
    for (let i = 0; i < siblings.length; i++) {
      siblings[i].sortOrder = i;
    }
  }

  /**
   * 新建节点落点：选中分组 → 作为其子节点；
   * 选中图元/实例 → 作为其同级；未选中 → 根级。
   */
  function resolveInsertParent(): string | null {
    const selected = selectedNode.value;
    if (!selected) return null;
    if (selected.nodeType === "group") return selected.id;
    return selected.parentId;
  }

  function nextSiblingSortOrder(parentId: string | null): number {
    const siblings = childrenOf(parentId);
    if (siblings.length === 0) return 0;
    return siblings[siblings.length - 1].sortOrder + 1;
  }

  /** 创建新图元。 */
  function addPrimitive(shape: PlaceableShape) {
    const parentId = resolveInsertParent();
    const node = defaultPrimitive(
      shape,
      nextName(nodes.value, shape),
      parentId,
      nextSiblingSortOrder(parentId),
    );
    nodes.value.push(node);
    reindexSiblings(parentId);
    selectedId.value = node.id;
    markDirty();
  }

  /**
   * 创建分组。parentId 传入时强制落点（右键「新建子分组」/空白处根级）；
   * 省略时走与 addPrimitive 相同的落点规则。
   */
  function addGroup(parentId?: string | null) {
    const parent = parentId !== undefined ? parentId : resolveInsertParent();
    const node = defaultGroup(
      nextName(nodes.value, "group"),
      parent,
      nextSiblingSortOrder(parent),
    );
    nodes.value.push(node);
    reindexSiblings(parent);
    selectedId.value = node.id;
    markDirty();
  }

  /** 选择节点（不视为未保存改动）。 */
  function select(id: string | null) {
    selectedId.value = id;
  }

  /** 开始拖拽节点。 */
  function beginDrag(id: string) {
    draggingId.value = id;
  }

  /** 结束拖拽节点。 */
  function endDrag() {
    draggingId.value = null;
  }

  /**
   * 节点能否以 newParentId 为父。不能成为自己的子节点，也不能挂到自己的后代分组下。
   */
  function canMoveTo(id: string, newParentId: string | null): boolean {
    if (id === newParentId) return false;
    const node = nodes.value.find((item) => item.id === id);
    if (!node) return false;
    if (newParentId === null) return true;
    const parent = nodes.value.find((item) => item.id === newParentId);
    if (!parent || parent.nodeType !== "group") return false;
    return !descendantIds(id).includes(newParentId);
  }

  /**
   * 把节点移到 newParentId 下的 index 位置（0-based，插到该下标之前；等于子节点数即末尾）。
   * 非法移动返回 false。同级内先摘除再算插入下标，避免偏移。
   */
  function moveNode(
    id: string,
    newParentId: string | null,
    index: number,
  ): boolean {
    if (!canMoveTo(id, newParentId)) return false;
    const node = nodes.value.find((item) => item.id === id);
    if (!node) return false;

    const oldParentId = node.parentId;
    const sameParent = oldParentId === newParentId;
    const oldIndex = childrenOf(oldParentId).findIndex((item) => item.id === id);
    if (oldIndex < 0) return false;

    const destExcluding = childrenOf(newParentId).filter((item) => item.id !== id);
    let insertIndex = index;
    if (sameParent && insertIndex > oldIndex) insertIndex -= 1;
    insertIndex = Math.max(0, Math.min(insertIndex, destExcluding.length));

    if (sameParent && insertIndex === oldIndex) {
      selectedId.value = id;
      return true;
    }

    node.parentId = newParentId;
    for (let i = 0; i < destExcluding.length; i++) {
      destExcluding[i].sortOrder = i < insertIndex ? i : i + 1;
    }
    node.sortOrder = insertIndex;

    if (!sameParent) reindexSiblings(oldParentId);
    reindexSiblings(newParentId);
    selectedId.value = id;
    markDirty();
    return true;
  }

  /* 重命名节点。 */
  function renameNode(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const node = nodes.value.find((item) => item.id === id);
    if (!node) return;
    node.name = trimmed;
    markDirty();
  }

  /** 删除节点及其整棵子树。 */
  function removeNode(id: string) {
    const target = nodes.value.find((node) => node.id === id);
    if (!target) return;
    const parentId = target.parentId;
    const toRemove = new Set([id, ...descendantIds(id)]);
    nodes.value = nodes.value.filter((node) => !toRemove.has(node.id));
    if (selectedId.value && toRemove.has(selectedId.value)) {
      selectedId.value = null;
    }
    reindexSiblings(parentId);
    markDirty();
  }

  /** 深拷贝子树，插到原节点之后同级；根副本名称加 `_副本`。 */
  function duplicateNode(id: string) {
    const original = nodes.value.find((node) => node.id === id);
    if (!original) return;
    const subtree = [id, ...descendantIds(id)];
    const idMap = new Map<string, string>();
    for (const oldId of subtree) {
      idMap.set(oldId, newNodeId());
    }
    const copies: ModelNode[] = [];
    for (const oldId of subtree) {
      const source = nodes.value.find((node) => node.id === oldId);
      if (!source) continue;
      const newId = idMap.get(oldId) as string;
      const isRoot = oldId === id;
      const newParentId = isRoot
        ? source.parentId
        : (idMap.get(source.parentId as string) as string);
      const newName = isRoot ? `${source.name}_副本` : source.name;
      copies.push(cloneNode(source, newId, newParentId, newName));
    }
    const rootCopy = copies.find((node) => node.id === idMap.get(id));
    if (!rootCopy) return;
    const origOrder = original.sortOrder;
    for (const node of nodes.value) {
      if (node.parentId === original.parentId && node.sortOrder > origOrder) {
        node.sortOrder += 1;
      }
    }
    rootCopy.sortOrder = origOrder + 1;
    nodes.value.push(...copies);
    reindexSiblings(original.parentId);
    selectedId.value = rootCopy.id;
    markDirty();
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

  /** 更新节点位置（相对父级的局部坐标）。 */
  function updatePosition(id: string, pos: Vec3) {
    const node = nodes.value.find((item) => item.id === id);
    if (!node) return;
    node.transform.pos = [pos[0], pos[1], pos[2]];
    markDirty();
  }

  /** 更新节点旋转（角度制，X → Y → Z；相对父级）。 */
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
    draggingId,
    childrenOf,
    descendantIds,
    addPrimitive,
    addGroup,
    renameNode,
    removeNode,
    duplicateNode,
    select,
    beginDrag,
    endDrag,
    canMoveTo,
    moveNode,
    updateDims,
    updatePosition,
    updateRotation,
    loadFromServer,
    clear,
    markClean,
  };
});
