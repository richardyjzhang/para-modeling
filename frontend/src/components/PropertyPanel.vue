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
      <div class="mt-4 space-y-1">
        <div class="text-xs text-slate-400">类型</div>
        <div class="text-slate-800">{{ typeLabel }}</div>
      </div>

      <div v-if="primitive" class="mt-4">
        <div class="mb-2 text-xs font-semibold text-slate-500">尺寸（mm）</div>
        <div v-for="field in dimFields" :key="field.key" class="mb-2">
          <label class="flex items-center gap-2">
            <span class="w-16 shrink-0 text-xs text-slate-500">{{ field.label }}</span>
            <input
              v-model="dimDraft[field.key]"
              type="text"
              :class="fieldClass(Boolean(dimErrors[field.key]))"
              @change="commitDim(field.key)"
              @keydown="onKeyStep($event, (dir) => stepDim(field.key, dir))"
            />
            <span class="flex shrink-0 flex-col">
              <button
                type="button"
                class="px-1 text-[9px] leading-none text-slate-500 hover:text-slate-800"
                @mousedown.prevent="stepDim(field.key, 1)"
              >
                ▲
              </button>
              <button
                type="button"
                class="px-1 text-[9px] leading-none text-slate-500 hover:text-slate-800"
                @mousedown.prevent="stepDim(field.key, -1)"
              >
                ▼
              </button>
            </span>
          </label>
          <p v-if="dimErrors[field.key]" class="ml-[4.5rem] mt-0.5 text-xs text-red-600">
            {{ dimErrors[field.key] }}
          </p>
        </div>
      </div>

      <div class="mt-4">
        <div class="mb-2 text-xs font-semibold text-slate-500">位置（mm，相对父级）</div>
        <div v-for="axis in AXES" :key="'pos-' + axis" class="mb-2">
          <label class="flex items-center gap-2">
            <span class="w-16 shrink-0 text-xs uppercase text-slate-500">{{ axis }}</span>
            <input
              v-model="posDraft[axis]"
              type="text"
              :class="fieldClass(Boolean(posErrors[axis]))"
              @change="commitPos(axis)"
              @keydown="onKeyStep($event, (dir) => stepPos(axis, dir))"
            />
            <span class="flex shrink-0 flex-col">
              <button
                type="button"
                class="px-1 text-[9px] leading-none text-slate-500 hover:text-slate-800"
                @mousedown.prevent="stepPos(axis, 1)"
              >
                ▲
              </button>
              <button
                type="button"
                class="px-1 text-[9px] leading-none text-slate-500 hover:text-slate-800"
                @mousedown.prevent="stepPos(axis, -1)"
              >
                ▼
              </button>
            </span>
          </label>
          <p v-if="posErrors[axis]" class="ml-[4.5rem] mt-0.5 text-xs text-red-600">
            {{ posErrors[axis] }}
          </p>
        </div>
      </div>

      <div class="mt-4">
        <div class="mb-2 text-xs font-semibold text-slate-500">旋转（°，相对父级）</div>
        <div v-for="axis in AXES" :key="'rot-' + axis" class="mb-2">
          <label class="flex items-center gap-2">
            <span class="w-16 shrink-0 text-xs uppercase text-slate-500">r{{ axis }}</span>
            <input
              v-model="rotDraft[axis]"
              type="text"
              :class="fieldClass(Boolean(rotErrors[axis]))"
              @change="commitRot(axis)"
              @keydown="onKeyStep($event, (dir) => stepRot(axis, dir))"
            />
            <span class="flex shrink-0 flex-col">
              <button
                type="button"
                class="px-1 text-[9px] leading-none text-slate-500 hover:text-slate-800"
                @mousedown.prevent="stepRot(axis, 1)"
              >
                ▲
              </button>
              <button
                type="button"
                class="px-1 text-[9px] leading-none text-slate-500 hover:text-slate-800"
                @mousedown.prevent="stepRot(axis, -1)"
              >
                ▼
              </button>
            </span>
          </label>
          <p v-if="rotErrors[axis]" class="ml-[4.5rem] mt-0.5 text-xs text-red-600">
            {{ rotErrors[axis] }}
          </p>
        </div>
      </div>
    </div>
    <p v-else class="px-3 py-3 text-xs leading-5 text-slate-400">
      在左侧树中选中一个节点，即可改位置和旋转；图元还可改尺寸。
    </p>
  </aside>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import {
  evalNonNegativeDim,
  evalNumericLiteral,
  evalPositiveDim,
  type EvalResult,
} from "../core/expression";
import {
  DIM_FIELDS,
  isPrimitiveNode,
  SHAPE_LABEL,
  type DimField,
  type PrimitiveNode,
} from "../core/types";
import { storeToRefs } from "pinia";
import { useModelTreeStore } from "../stores/modelTree";

const DIM_STEP = 10;
const POS_STEP = 10;
const ROT_STEP = 15;

const store = useModelTreeStore();
const { selectedNode } = storeToRefs(store);

const dimDraft = reactive<Record<string, string>>({});
const dimErrors = reactive<Record<string, string>>({});
const posDraft = reactive({ x: "", y: "", z: "" });
const posErrors = reactive({ x: "", y: "", z: "" });
const rotDraft = reactive({ x: "", y: "", z: "" });
const rotErrors = reactive({ x: "", y: "", z: "" });

const primitive = computed((): PrimitiveNode | null => {
  const node = selectedNode.value;
  if (!node || !isPrimitiveNode(node)) return null;
  return node;
});

const typeLabel = computed(() => {
  const node = selectedNode.value;
  if (!node) return "";
  if (isPrimitiveNode(node)) return SHAPE_LABEL[node.shape];
  if (node.nodeType === "group") return "分组";
  return "实例";
});

const dimFields = computed(() => {
  if (!primitive.value) return [];
  return DIM_FIELDS[primitive.value.shape];
});

const AXES = ["x", "y", "z"] as const;
type Axis = (typeof AXES)[number];

/** 步进后去掉浮点尾巴，整数不带小数点。 */
function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(6)));
}

function currentNumber(raw: string): number {
  const result = evalNumericLiteral(raw);
  return result.ok ? result.value : 0;
}

function setError(bag: Record<string, string>, key: string, message: string) {
  bag[key] = message;
}

function clearError(bag: Record<string, string>, key: string) {
  bag[key] = "";
}

function evalDim(raw: string, field: DimField): EvalResult {
  return field.allowZero ? evalNonNegativeDim(raw) : evalPositiveDim(raw);
}

/** 切换选中节点时重填草稿；不 deep watch，以免改合法字段时把别的非法输入冲掉。 */
function syncDraft() {
  const node = selectedNode.value;
  for (const key of Object.keys(dimDraft)) {
    delete dimDraft[key];
  }
  for (const key of Object.keys(dimErrors)) {
    delete dimErrors[key];
  }
  posErrors.x = "";
  posErrors.y = "";
  posErrors.z = "";
  rotErrors.x = "";
  rotErrors.y = "";
  rotErrors.z = "";
  if (!node) {
    posDraft.x = "";
    posDraft.y = "";
    posDraft.z = "";
    rotDraft.x = "";
    rotDraft.y = "";
    rotDraft.z = "";
    return;
  }
  posDraft.x = String(node.transform.pos[0]);
  posDraft.y = String(node.transform.pos[1]);
  posDraft.z = String(node.transform.pos[2]);
  rotDraft.x = String(node.transform.rot[0]);
  rotDraft.y = String(node.transform.rot[1]);
  rotDraft.z = String(node.transform.rot[2]);
  if (node.nodeType === "primitive") {
    for (const field of DIM_FIELDS[node.shape]) {
      dimDraft[field.key] = (node.dims as Record<string, string>)[field.key] ?? "";
    }
  }
}

watch(
  () => selectedNode.value?.id,
  () => {
    syncDraft();
  },
  { immediate: true },
);

function commitDim(key: string) {
  const node = primitive.value;
  if (!node) return;
  const field = DIM_FIELDS[node.shape].find((item) => item.key === key);
  if (!field) return;
  const raw = (dimDraft[key] ?? "").trim();
  dimDraft[key] = raw;
  const result = evalDim(raw, field);
  if (!result.ok) {
    setError(dimErrors, key, result.message);
    return;
  }
  clearError(dimErrors, key);
  store.updateDims(node.id, { [key]: raw });
}

function stepDim(key: string, direction: 1 | -1) {
  const node = primitive.value;
  if (!node) return;
  const field = DIM_FIELDS[node.shape].find((item) => item.key === key);
  if (!field) return;
  const next = currentNumber(dimDraft[key] ?? "") + direction * DIM_STEP;
  if (field.allowZero) {
    dimDraft[key] = formatNumber(Math.max(0, next));
  } else if (next <= 0) {
    return;
  } else {
    dimDraft[key] = formatNumber(next);
  }
  commitDim(key);
}

function commitPos(axis: Axis) {
  const node = selectedNode.value;
  if (!node) return;
  const raw = posDraft[axis].trim();
  posDraft[axis] = raw;
  const result = evalNumericLiteral(raw);
  if (!result.ok) {
    setError(posErrors, axis, result.message);
    return;
  }
  clearError(posErrors, axis);
  const pos: [number, number, number] = [
    axis === "x" ? result.value : node.transform.pos[0],
    axis === "y" ? result.value : node.transform.pos[1],
    axis === "z" ? result.value : node.transform.pos[2],
  ];
  store.updatePosition(node.id, pos);
}

function stepPos(axis: Axis, direction: 1 | -1) {
  const next = currentNumber(posDraft[axis]) + direction * POS_STEP;
  posDraft[axis] = formatNumber(next);
  commitPos(axis);
}

function commitRot(axis: Axis) {
  const node = selectedNode.value;
  if (!node) return;
  const raw = rotDraft[axis].trim();
  rotDraft[axis] = raw;
  const result = evalNumericLiteral(raw);
  if (!result.ok) {
    setError(rotErrors, axis, result.message);
    return;
  }
  clearError(rotErrors, axis);
  const rot: [number, number, number] = [
    axis === "x" ? result.value : node.transform.rot[0],
    axis === "y" ? result.value : node.transform.rot[1],
    axis === "z" ? result.value : node.transform.rot[2],
  ];
  store.updateRotation(node.id, rot);
}

function stepRot(axis: Axis, direction: 1 | -1) {
  const next = currentNumber(rotDraft[axis]) + direction * ROT_STEP;
  rotDraft[axis] = formatNumber(next);
  commitRot(axis);
}

function onKeyStep(event: KeyboardEvent, step: (direction: 1 | -1) => void) {
  if (event.key === "ArrowUp") {
    event.preventDefault();
    step(1);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    step(-1);
  }
}

function fieldClass(hasError: boolean): string {
  const base =
    "w-full rounded border px-2 py-1 text-sm outline-none";
  return hasError
    ? `${base} border-red-500`
    : `${base} border-slate-200 focus:border-blue-400`;
}
</script>
