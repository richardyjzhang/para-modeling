<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { evalNumericLiteral, evalPositiveDim } from "../core/expression";
import {
  DIM_FIELDS,
  isPrimitiveNode,
  SHAPE_LABEL,
  type PrimitiveNode,
} from "../core/types";
import { storeToRefs } from "pinia";
import { useModelTreeStore } from "../stores/modelTree";

const store = useModelTreeStore();
const { selectedNode } = storeToRefs(store);

const dimDraft = reactive<Record<string, string>>({});
const posDraft = reactive({ x: "", y: "", z: "" });
const errorText = ref("");

const primitive = computed((): PrimitiveNode | null => {
  const node = selectedNode.value;
  if (!node || !isPrimitiveNode(node)) return null;
  return node;
});

const dimFields = computed(() => {
  if (!primitive.value) return [];
  return DIM_FIELDS[primitive.value.shape];
});

const POS_AXES = ["x", "y", "z"] as const;


/** 同步选中节点的数据到编辑草稿 */
function syncDraft() {
  errorText.value = "";
  const node = selectedNode.value;
  if (!node) return;
  posDraft.x = String(node.transform.pos[0]);
  posDraft.y = String(node.transform.pos[1]);
  posDraft.z = String(node.transform.pos[2]);
  for (const key of Object.keys(dimDraft)) {
    delete dimDraft[key];
  }
  if (node.nodeType === "primitive") {
    for (const field of DIM_FIELDS[node.shape]) {
      dimDraft[field.key] = (node.dims as Record<string, string>)[field.key] ?? "";
    }
  }
}

watch(selectedNode, syncDraft, { immediate: true, deep: true });

/** 提交尺寸编辑 */
function commitDim(key: string) {
  const node = primitive.value;
  if (!node) return;
  const raw = (dimDraft[key] ?? "").trim();
  const result = evalPositiveDim(raw);
  if (!result.ok) {
    errorText.value = result.message;
    dimDraft[key] = (node.dims as Record<string, string>)[key] ?? "";
    return;
  }
  errorText.value = "";
  store.updateDims(node.id, { [key]: raw });
}

/** 提交位置编辑 */
function commitPos(axis: "x" | "y" | "z") {
  const node = selectedNode.value;
  if (!node) return;
  const result = evalNumericLiteral(posDraft[axis]);
  if (!result.ok) {
    errorText.value = result.message;
    const index = axis === "x" ? 0 : axis === "y" ? 1 : 2;
    posDraft[axis] = String(node.transform.pos[index]);
    return;
  }
  errorText.value = "";
  const pos: [number, number, number] = [
    axis === "x" ? result.value : node.transform.pos[0],
    axis === "y" ? result.value : node.transform.pos[1],
    axis === "z" ? result.value : node.transform.pos[2],
  ];
  store.updatePosition(node.id, pos);
}
</script>

<template>
  <aside class="flex h-full flex-col border-l border-slate-200 bg-white">
    <div class="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">
      属性
    </div>
    <div v-if="selectedNode" class="min-h-0 flex-1 overflow-auto px-3 py-3 text-sm">
      <div class="space-y-1">
        <div class="text-xs text-slate-400">名称</div>
        <div class="text-slate-800">{{ selectedNode.name }}</div>
      </div>
      <div v-if="primitive" class="mt-4 space-y-1">
        <div class="text-xs text-slate-400">类型</div>
        <div class="text-slate-800">{{ SHAPE_LABEL[primitive.shape] }}</div>
      </div>

      <div v-if="primitive" class="mt-4">
        <div class="mb-2 text-xs font-semibold text-slate-500">尺寸（mm）</div>
        <label
          v-for="field in dimFields"
          :key="field.key"
          class="mb-2 flex items-center gap-2"
        >
          <span class="w-16 shrink-0 text-xs text-slate-500">{{ field.label }}</span>
          <input
            v-model="dimDraft[field.key]"
            type="text"
            class="w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
            @change="commitDim(field.key)"
          />
        </label>
      </div>

      <div class="mt-4">
        <div class="mb-2 text-xs font-semibold text-slate-500">位置（mm）</div>
        <label
          v-for="axis in POS_AXES"
          :key="axis"
          class="mb-2 flex items-center gap-2"
        >
          <span class="w-16 shrink-0 text-xs uppercase text-slate-500">{{ axis }}</span>
          <input
            v-model="posDraft[axis]"
            type="text"
            class="w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
            @change="commitPos(axis)"
          />
        </label>
      </div>

      <p v-if="errorText" class="mt-2 text-xs text-red-600">{{ errorText }}</p>
    </div>
    <p v-else class="px-3 py-3 text-xs leading-5 text-slate-400">
      在左侧树中选中一个节点，即可改尺寸和位置。
    </p>
  </aside>
</template>
