<script setup lang="ts">
import { onMounted, ref } from "vue";
import { fetchHello, type HelloResponse } from "./api/hello";

const loading = ref(true);
const error = ref("");
const data = ref<HelloResponse | null>(null);

onMounted(async () => {
  try {
    data.value = await fetchHello();
  } catch {
    error.value =
      "无法连接后端。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <main class="mx-auto max-w-xl px-6 py-16">
      <h1 class="text-3xl font-semibold tracking-tight text-slate-900">
        para-modeling
      </h1>
      <p class="mt-2 text-slate-500">第 1 期 · 项目骨架，验证前后端链路</p>

      <section class="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 class="text-sm font-medium uppercase tracking-wide text-slate-400">
          后端 /api/hello
        </h2>

        <p v-if="loading" class="mt-4 text-slate-500">正在请求后端…</p>

        <p
          v-else-if="error"
          class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
        >
          {{ error }}
        </p>

        <dl v-else-if="data" class="mt-4 space-y-3">
          <div>
            <dt class="text-xs text-slate-400">问候语</dt>
            <dd class="text-lg text-slate-900">{{ data.message }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-400">后端版本</dt>
            <dd class="font-mono">{{ data.version }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-400">服务器时间</dt>
            <dd class="font-mono">{{ data.serverTime }}</dd>
          </div>
        </dl>
      </section>
    </main>
  </div>
</template>
