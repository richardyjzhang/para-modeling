<template>
  <div>
    <div
      class="flex w-full items-center py-1 pr-3 text-left text-sm"
      :class="
        store.selectedId === node.id
          ? 'bg-blue-50 text-blue-900'
          : 'text-slate-700 hover:bg-slate-50'
      "
      :style="{ paddingLeft: `${8 + depth * 14}px` }"
      @click="store.select(node.id)"
      @contextmenu.prevent.stop="emit('nodeContext', $event, node.id)"
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

const store = useModelTreeStore();
const expanded = ref(true);

const children = computed(() => store.childrenOf(props.node.id));

const typeLabel = computed(() => {
  if (isPrimitiveNode(props.node)) return SHAPE_LABEL[props.node.shape];
  if (props.node.nodeType === "group") return "分组";
  return "实例";
});

function onChildContext(event: MouseEvent, nodeId: string) {
  emit("nodeContext", event, nodeId);
}
</script>
