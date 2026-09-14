<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-40"
      @mousedown.self="emit('close')"
      @contextmenu.prevent="emit('close')"
    >
      <ul
        class="fixed z-50 min-w-[148px] rounded border border-slate-200 bg-white py-1 text-sm shadow-md"
        :style="{ left: `${x}px`, top: `${y}px` }"
        @mousedown.stop
      >
        <li v-for="item in items" :key="item.id">
          <button
            type="button"
            class="w-full px-3 py-1.5 text-left"
            :class="
              item.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-slate-700 hover:bg-slate-50'
            "
            @click="emit('choose', item.id)"
          >
            {{ item.label }}
          </button>
        </li>
      </ul>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

export type MenuItem = {
  id: string;
  label: string;
  danger?: boolean;
};

defineProps<{
  x: number;
  y: number;
  items: MenuItem[];
}>();

const emit = defineEmits<{
  close: [];
  choose: [id: string];
}>();

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

onMounted(() => {
  window.addEventListener("keydown", onKey);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
});
</script>
