<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref } from 'vue'

// ClickGUI 的一个分类面板：按住标题栏拖动，点右侧箭头（或右键标题）折叠
const props = defineProps<{
  title: string
  online: number
  total: number
  x: number
  y: number
  z: number
  collapsed: boolean
  floating: boolean
  /** position in the list, for the staggered entrance */
  index: number
}>()
const emit = defineEmits<{ move: [x: number, y: number], focus: [], toggle: [] }>()

const dragging = ref(false)
let startX = 0
let startY = 0
let originX = 0
let originY = 0

function onPointerDown(event: PointerEvent) {
  if (!props.floating || event.button !== 0 || (event.target as HTMLElement).closest('button'))
    return
  dragging.value = true
  startX = event.clientX
  startY = event.clientY
  originX = props.x
  originY = props.y
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function onPointerMove(event: PointerEvent) {
  if (!dragging.value)
    return
  emit('move', Math.max(0, originX + event.clientX - startX), Math.max(0, originY + event.clientY - startY))
}
function onPointerUp() {
  dragging.value = false
}
</script>

<template>
  <section
    class="az-panel az-panel-enter" :class="{ 'az-panel-floating': floating, 'az-panel-dragging': dragging }"
    :style="floating ? { 'transform': `translate(${x}px, ${y}px)`, 'zIndex': z, '--az-delay': `${index * 45}ms` } : { '--az-delay': `${index * 45}ms` }"
    :aria-label="`${title} 面板`"
    @pointerdown.capture="emit('focus')"
  >
    <header
      class="az-panel-header" :class="floating ? 'cursor-grab active:cursor-grabbing' : ''"
      @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp"
      @contextmenu.prevent="emit('toggle')"
    >
      <span class="truncate">{{ title }}</span>
      <span class="ml-auto shrink-0 text-[11px] font-normal tracking-normal text-white/55">{{ online }}/{{ total }}</span>
      <button type="button" class="az-icon-button" :aria-label="collapsed ? '展开面板' : '折叠面板'" :aria-expanded="!collapsed" @click="emit('toggle')">
        <Icon icon="tabler:chevron-down" width="14" class="transition-transform duration-200" :class="collapsed ? '-rotate-90' : ''" />
      </button>
    </header>
    <div class="az-collapse" :class="{ 'az-collapse-open': !collapsed }">
      <div class="min-h-0 overflow-hidden">
        <div class="az-panel-body">
          <slot />
        </div>
      </div>
    </div>
  </section>
</template>
