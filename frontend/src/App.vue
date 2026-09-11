<script setup lang="ts">
import { onMounted, ref } from "vue";
import { fetchHello } from "./api/hello";
import Viewport3d from "./components/Viewport3d.vue";

const backendOk = ref<boolean | null>(null);
const backendHint = ref("正在检查后端…");

onMounted(async () => {
  try {
    const data = await fetchHello();
    backendOk.value = true;
    backendHint.value = `后端已连接 · ${data.version}`;
  } catch {
    backendOk.value = false;
    backendHint.value = "无法连接后端";
  }
});
</script>

<template>
  <div class="flex h-screen flex-col bg-slate-100 text-slate-800">
    <header
      class="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4"
    >
      <div class="flex items-baseline gap-3">
        <h1 class="text-sm font-semibold text-slate-900">para-modeling</h1>
        <span class="text-xs text-slate-400">第 2 期 · Three.js 视口</span>
      </div>
      <span
        class="inline-flex items-center gap-1.5 text-xs text-slate-500"
        :title="backendHint"
      >
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="{
            'bg-slate-300': backendOk === null,
            'bg-emerald-500': backendOk === true,
            'bg-red-500': backendOk === false,
          }"
        />
        {{ backendHint }}
      </span>
    </header>
    <main class="min-h-0 flex-1">
      <Viewport3d />
    </main>
  </div>
</template>
