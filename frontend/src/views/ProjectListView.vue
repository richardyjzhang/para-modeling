<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <header
      class="flex h-10 items-center justify-between border-b border-slate-200 bg-white px-4"
    >
      <div class="flex items-baseline gap-3">
        <router-link to="/" class="text-sm font-semibold text-slate-900 hover:text-slate-700">
          para-modeling
        </router-link>
        <span class="text-xs text-slate-400">项目列表</span>
      </div>
      <button
        type="button"
        class="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
        @click="onCreate"
      >
        新建项目
      </button>
    </header>

    <main class="mx-auto max-w-3xl px-4 py-6">
      <p v-if="loading" class="text-sm text-slate-500">加载中…</p>
      <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p
        v-else-if="projects.length === 0"
        class="text-sm text-slate-500"
      >
        还没有项目。点右上角「新建项目」开始搭积木。
      </p>
      <ul v-else class="grid gap-3 sm:grid-cols-2">
        <li v-for="project in projects" :key="project.id">
          <div
            class="flex cursor-pointer flex-col rounded border border-slate-200 bg-white p-3 hover:border-slate-300"
            @click="openProject(project.id)"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="truncate text-sm font-medium text-slate-900">
                {{ project.name }}
              </span>
              <span class="flex shrink-0 gap-1">
                <button
                  type="button"
                  class="text-xs text-slate-400 hover:text-slate-700"
                  @click="onRename(project, $event)"
                >
                  改名
                </button>
                <button
                  type="button"
                  class="text-xs text-slate-400 hover:text-red-600"
                  @click="onDelete(project, $event)"
                >
                  删除
                </button>
              </span>
            </div>
            <span class="mt-1 text-xs text-slate-400">
              更新于 {{ project.updatedAt }}
            </span>
          </div>
        </li>
      </ul>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  createProject,
  deleteProject,
  listProjects,
  renameProject,
  type Project,
} from "../api/projects";

const router = useRouter();
const projects = ref<Project[]>([]);
const loading = ref(true);
const error = ref("");

/** 刷新项目列表 */
async function refresh() {
  loading.value = true;
  error.value = "";
  try {
    const data = await listProjects();
    projects.value = data.projects;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载项目列表失败";
  } finally {
    loading.value = false;
  }
}

/** 新建项目 */
async function onCreate() {
  const name = window.prompt("项目名称", "未命名项目");
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    const project = await createProject(trimmed);
    await router.push(`/projects/${project.id}`);
  } catch (err) {
    window.alert(err instanceof Error ? err.message : "新建失败");
  }
}

/** 重命名项目 */
async function onRename(project: Project, event: Event) {
  event.stopPropagation();
  const name = window.prompt("项目名称", project.name);
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed || trimmed === project.name) return;
  try {
    await renameProject(project.id, trimmed);
    await refresh();
  } catch (err) {
    window.alert(err instanceof Error ? err.message : "改名失败");
  }
}

/** 删除项目 */
async function onDelete(project: Project, event: Event) {
  event.stopPropagation();
  const ok = window.confirm(
    `删除项目「${project.name}」？模型树会一并删除，无法恢复。`,
  );
  if (!ok) return;
  try {
    await deleteProject(project.id);
    await refresh();
  } catch (err) {
    window.alert(err instanceof Error ? err.message : "删除失败");
  }
}

/** 打开项目 */
function openProject(id: string) {
  router.push(`/projects/${id}`);
}

/** 组件挂载时刷新项目列表 */
onMounted(() => {
  void refresh();
});
</script>
