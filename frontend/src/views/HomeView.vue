<template>
  <div class="flex h-screen flex-col items-center justify-center bg-slate-100 text-slate-800">
    <h1 class="text-xl font-semibold text-slate-900">para-modeling</h1>
    <p class="mt-2 text-sm text-slate-500">Web 端参数化建模工具</p>
    <RouterLink
      to="/projects"
      class="mt-6 rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
    >
      进入项目列表
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>
