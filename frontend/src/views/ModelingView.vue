<template>
  <div class="flex h-screen flex-col bg-slate-100 text-slate-800">
    <header
      class="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4"
    >
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex min-w-0 items-baseline gap-3">
          <router-link
            to="/projects"
            class="shrink-0 text-xs text-slate-500 hover:text-slate-800"
          >
            返回列表
          </router-link>
          <h1 class="truncate text-sm font-semibold text-slate-900">
            {{ project?.name ?? "建模" }}
          </h1>
          <span class="shrink-0 text-xs text-slate-400">第 7 期 · 选中与联动</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
            @click="store.addGroup()"
          >
            新建分组
          </button>
          <button
            v-for="shape in PLACEABLE_SHAPES"
            :key="shape"
            type="button"
            class="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
            @click="store.addPrimitive(shape)"
          >
            添加{{ SHAPE_LABEL[shape] }}
          </button>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <span v-if="store.dirty" class="text-xs text-amber-600">未保存</span>
        <span v-else-if="saveHint" class="text-xs text-slate-400">{{ saveHint }}</span>
        <button
          type="button"
          class="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          :disabled="saving || !project"
          @click="onSave"
        >
          {{ saving ? "保存中…" : "保存" }}
        </button>
      </div>
    </header>
    <p
      v-if="loadError"
      class="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600"
    >
      {{ loadError }}
    </p>
    <main class="flex min-h-0 flex-1">
      <div class="h-full w-56 shrink-0">
        <ModelTreePanel />
      </div>
      <div class="h-full min-w-0 flex-1">
        <Viewport3d />
      </div>
      <div class="h-full w-60 shrink-0">
        <PropertyPanel />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute } from "vue-router";
import {
  fetchProject,
  fetchProjectNodes,
  modelNodesToPersist,
  saveProjectNodes,
  type Project,
} from "../api/projects";
import ModelTreePanel from "../components/ModelTreePanel.vue";
import PropertyPanel from "../components/PropertyPanel.vue";
import Viewport3d from "../components/Viewport3d.vue";
import { PLACEABLE_SHAPES, SHAPE_LABEL } from "../core/types";
import { useModelTreeStore } from "../stores/modelTree";

const route = useRoute();
const store = useModelTreeStore();

const project = ref<Project | null>(null);
const loadError = ref("");
const saving = ref(false);
const saveHint = ref("");

async function loadProject(id: string) {
  loadError.value = "";
  saveHint.value = "";
  store.clear();
  project.value = null;
  try {
    const [info, tree] = await Promise.all([
      fetchProject(id),
      fetchProjectNodes(id),
    ]);
    project.value = info;
    store.loadFromServer(tree.nodes);
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : "加载项目失败";
  }
}

async function onSave() {
  const id = typeof route.params.id === "string" ? route.params.id : "";
  if (!id || saving.value) return;
  saving.value = true;
  saveHint.value = "";
  try {
    await saveProjectNodes(id, modelNodesToPersist(store.nodes));
    store.markClean();
    saveHint.value = "已保存";
  } catch (err) {
    saveHint.value = err instanceof Error ? err.message : "保存失败";
  } finally {
    saving.value = false;
  }
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!store.dirty) return;
  event.preventDefault();
  event.returnValue = "";
}

onBeforeRouteLeave(() => {
  if (!store.dirty) {
    store.clear();
    return true;
  }
  const ok = window.confirm("有未保存的改动，确定离开？");
  if (!ok) return false;
  store.clear();
  return true;
});

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === "string" && id) {
      void loadProject(id);
    }
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("beforeunload", onBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", onBeforeUnload);
});
</script>
