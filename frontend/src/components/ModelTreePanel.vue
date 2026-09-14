<template>
  <aside
    class="flex h-full flex-col border-r border-slate-200 bg-white"
    @contextmenu.prevent="onBlankContext"
  >
    <div
      class="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
      @contextmenu.prevent.stop
    >
      模型树
    </div>
    <div v-if="roots.length > 0" class="min-h-0 flex-1 overflow-auto py-1">
      <ModelTreeNode
        v-for="node in roots"
        :key="node.id"
        :node="node"
        :depth="0"
        @node-context="onNodeContext"
      />
    </div>
    <p v-else class="px-3 py-3 text-xs leading-5 text-slate-400">
      还没有节点。点顶部按钮添加图元或分组，或在此处右键新建分组。
    </p>
    <TreeContextMenu
      v-if="menu"
      :x="menu.x"
      :y="menu.y"
      :items="menuItems"
      @close="menu = null"
      @choose="onMenuChoose"
    />
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import ModelTreeNode from "./ModelTreeNode.vue";
import TreeContextMenu, { type MenuItem } from "./TreeContextMenu.vue";
import { useModelTreeStore } from "../stores/modelTree";

const store = useModelTreeStore();
const roots = computed(() => store.childrenOf(null));

type MenuState = { x: number; y: number; nodeId: string | null };
const menu = ref<MenuState | null>(null);

/* 右键菜单项。 */
const menuItems = computed((): MenuItem[] => {
  const nodeId = menu.value?.nodeId ?? null;
  if (!nodeId) {
    return [{ id: "addRootGroup", label: "新建分组" }];
  }
  const node = store.nodes.find((item) => item.id === nodeId);
  if (!node) return [];
  const items: MenuItem[] = [];
  if (node.nodeType === "group") {
    items.push({ id: "addChildGroup", label: "新建子分组" });
  }
  items.push(
    { id: "rename", label: "重命名" },
    { id: "duplicate", label: "复制" },
    { id: "remove", label: "删除", danger: true },
  );
  return items;
});

/* 当节点右键时，显示上下文菜单。 */
function onNodeContext(event: MouseEvent, nodeId: string) {
  store.select(nodeId);
  menu.value = { x: event.clientX, y: event.clientY, nodeId };
}

/* 当空白处右键时，显示上下文菜单。 */
function onBlankContext(event: MouseEvent) {
  menu.value = { x: event.clientX, y: event.clientY, nodeId: null };
}

/* 当上下文菜单选择时，执行操作。 */
function onMenuChoose(action: string) {
  const nodeId = menu.value?.nodeId ?? null;
  menu.value = null;
  if (action === "addRootGroup") {
    store.addGroup(null);
    return;
  }
  if (!nodeId) return;
  if (action === "addChildGroup") {
    store.addGroup(nodeId);
    return;
  }
  if (action === "rename") {
    const node = store.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    const next = window.prompt("新名称", node.name);
    if (next === null) return;
    store.renameNode(nodeId, next);
    return;
  }
  if (action === "duplicate") {
    store.duplicateNode(nodeId);
    return;
  }
  if (action === "remove") {
    const childCount = store.descendantIds(nodeId).length;
    const message =
      childCount > 0
        ? `将连同 ${childCount} 个子节点一起删除，确定删除？`
        : "确定删除该节点？";
    if (!window.confirm(message)) return;
    store.removeNode(nodeId);
  }
}
</script>
