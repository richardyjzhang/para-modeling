<template>
  <div>
    <div
      class="flex w-full items-center border-y-2 py-1 pr-3 text-left text-sm"
      :class="rowClass"
      :style="{ paddingLeft: `${8 + depth * 14}px` }"
      draggable="true"
      @click="store.select(node.id)"
      @contextmenu.prevent.stop="emit('nodeContext', $event, node.id)"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <button
        v-if="isGroupNode(node)"
        type="button"
        class="mr-0.5 w-4 shrink-0 text-center text-[10px] text-slate-400"
        @click.stop="expanded = !expanded"
      >
        {{ expanded ? "▼" : "▶" }}
      </button>
      <span v-else class="mr-0.5 inline-block w-4 shrink-0" />
      <span class="min-w-0 flex-1 truncate">{{ node.name }}</span>
      <span class="ml-2 shrink-0 text-xs text-slate-400">{{ typeLabel }}</span>
    </div>
    <template v-if="isGroupNode(node) && expanded">
      <ModelTreeNode
        v-for="child in children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        @node-context="onChildContext"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { isGroupNode, isPrimitiveNode, SHAPE_LABEL, type ModelNode } from "../core/types";
import { useModelTreeStore } from "../stores/modelTree";

defineOptions({ name: "ModelTreeNode" });

const props = defineProps<{
  node: ModelNode;
  depth: number;
}>();

const emit = defineEmits<{
  nodeContext: [event: MouseEvent, nodeId: string];
}>();

type DropZone = "before" | "inside" | "after";

const store = useModelTreeStore();
const expanded = ref(true);
const hoverZone = ref<DropZone | null>(null);

const children = computed(() => store.childrenOf(props.node.id));

const typeLabel = computed(() => {
  if (isPrimitiveNode(props.node)) return SHAPE_LABEL[props.node.shape];
  if (props.node.nodeType === "group") return "分组";
  return "实例";
});

const rowClass = computed(() => {
  const dragging = store.draggingId === props.node.id;
  const selected = store.selectedId === props.node.id;
  const zone = hoverZone.value;
  const classes: string[] = [];
  if (dragging) classes.push("opacity-50");
  if (zone === "before") {
    classes.push("border-t-blue-500 border-b-transparent");
  } else if (zone === "after") {
    classes.push("border-t-transparent border-b-blue-500");
  } else {
    classes.push("border-transparent");
  }
  if (zone === "inside") {
    classes.push("bg-blue-100 text-blue-900");
  } else if (selected) {
    classes.push("bg-blue-50 text-blue-900");
  } else {
    classes.push("text-slate-700 hover:bg-slate-50");
  }
  return classes;
});

function onChildContext(event: MouseEvent, nodeId: string) {
  emit("nodeContext", event, nodeId);
}

function onDragStart(event: DragEvent) {
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = "move";
  // Firefox 没有 setData 就不会启动拖拽
  event.dataTransfer.setData("text/plain", props.node.id);
  store.beginDrag(props.node.id);
}

function onDragEnd() {
  hoverZone.value = null;
  store.endDrag();
}

/** 按鼠标在行内的纵向比例划分落点区。 */
function hitZone(event: DragEvent): DropZone {
  const el = event.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
  if (isGroupNode(props.node)) {
    if (ratio < 0.25) return "before";
    if (ratio > 0.75) return "after";
    return "inside";
  }
  return ratio < 0.5 ? "before" : "after";
}

function isZoneValid(zone: DropZone, dragId: string): boolean {
  if (dragId === props.node.id) return false;
  if (zone === "inside") return store.canMoveTo(dragId, props.node.id);
  return store.canMoveTo(dragId, props.node.parentId);
}

function onDragOver(event: DragEvent) {
  event.stopPropagation();
  const dragId = store.draggingId;
  if (!dragId || !event.dataTransfer) {
    hoverZone.value = null;
    return;
  }
  const zone = hitZone(event);
  if (!isZoneValid(zone, dragId)) {
    hoverZone.value = null;
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  hoverZone.value = zone;
}

function onDragLeave(event: DragEvent) {
  const row = event.currentTarget as HTMLElement;
  const related = event.relatedTarget;
  if (related instanceof Node && row.contains(related)) return;
  hoverZone.value = null;
}

function onDrop(event: DragEvent) {
  event.stopPropagation();
  event.preventDefault();
  const dragId = store.draggingId;
  const zone = hoverZone.value;
  hoverZone.value = null;
  if (!dragId || !zone || !isZoneValid(zone, dragId)) return;
  if (zone === "inside") {
    store.moveNode(dragId, props.node.id, store.childrenOf(props.node.id).length);
    return;
  }
  const siblings = store.childrenOf(props.node.parentId);
  const targetIndex = siblings.findIndex((item) => item.id === props.node.id);
  if (targetIndex < 0) return;
  const insertIndex = zone === "before" ? targetIndex : targetIndex + 1;
  store.moveNode(dragId, props.node.parentId, insertIndex);
}
</script>
