<script setup lang="ts">
import { useModelTreeStore } from "../stores/modelTree";
import { isPrimitiveNode, SHAPE_LABEL } from "../core/types";

const store = useModelTreeStore();
</script>

<template>
  <aside class="flex h-full flex-col border-r border-slate-200 bg-white">
    <div class="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">
      模型树
    </div>
    <ul v-if="store.nodes.length > 0" class="min-h-0 flex-1 overflow-auto py-1 text-sm">
      <li v-for="node in store.nodes" :key="node.id">
        <button
          type="button"
          class="flex w-full items-center justify-between px-3 py-1.5 text-left"
          :class="
            store.selectedId === node.id
              ? 'bg-blue-50 text-blue-900'
              : 'text-slate-700 hover:bg-slate-50'
          "
          @click="store.select(node.id)"
        >
          <span class="truncate">{{ node.name }}</span>
          <span class="ml-2 shrink-0 text-xs text-slate-400">
            {{ isPrimitiveNode(node) ? SHAPE_LABEL[node.shape] : node.nodeType }}
          </span>
        </button>
      </li>
    </ul>
    <p v-else class="px-3 py-3 text-xs leading-5 text-slate-400">
      还没有图元。点顶部按钮往场景里添加图元。
    </p>
  </aside>
</template>
