<script setup lang="ts">
import type { SettingDef, VisualModuleDef } from '@/azure/config'
import { ref } from 'vue'
import { useVisualConfig } from '@/azure/config'

// A client module: left click switches it on or off, right click opens its
// settings (checkboxes, mode switches and draggable sliders).
const props = defineProps<{ module: VisualModuleDef }>()
const config = useVisualConfig()
const open = ref(false)

function modeLabel(setting: Extract<SettingDef, { type: 'mode' }>): string {
  const value = config.get<string>(props.module.id, setting.key)
  return setting.options.find(option => option[0] === value)?.[1] ?? value
}
function cycle(setting: Extract<SettingDef, { type: 'mode' }>, step: 1 | -1) {
  const index = setting.options.findIndex(option => option[0] === config.get<string>(props.module.id, setting.key))
  const next = setting.options[(index + step + setting.options.length) % setting.options.length]!
  config.set(props.module.id, setting.key, next[0])
}
function sliderPercent(setting: Extract<SettingDef, { type: 'slider' }>): number {
  return (config.get<number>(props.module.id, setting.key) - setting.min) / (setting.max - setting.min) * 100
}
function drag(setting: Extract<SettingDef, { type: 'slider' }>, event: PointerEvent) {
  const element = event.currentTarget as HTMLElement
  if (event.type === 'pointerdown')
    element.setPointerCapture(event.pointerId)
  else if (!element.hasPointerCapture(event.pointerId))
    return
  const rect = element.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const raw = setting.min + ratio * (setting.max - setting.min)
  config.set(props.module.id, setting.key, Math.round(raw / setting.step) * setting.step)
}
function nudge(setting: Extract<SettingDef, { type: 'slider' }>, direction: 1 | -1) {
  const value = config.get<number>(props.module.id, setting.key) + direction * setting.step
  config.set(props.module.id, setting.key, Math.min(setting.max, Math.max(setting.min, value)))
}
</script>

<template>
  <div class="az-module" :class="{ 'az-module-on': config.get(module.id, 'enabled'), 'az-module-open': open }">
    <div class="az-module-row">
      <button
        type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left" :title="`${module.description}（左键开关，右键设置）`"
        :aria-pressed="config.get<boolean>(module.id, 'enabled')"
        @click="config.toggle(module.id)" @contextmenu.prevent="open = !open"
      >
        <span class="truncate">{{ module.name }}</span>
        <span class="ml-auto shrink-0 text-[11px] opacity-70">{{ config.get(module.id, 'enabled') ? 'ON' : 'OFF' }}</span>
      </button>
      <button type="button" class="az-icon-button" :aria-label="`${module.name} 设置`" :aria-expanded="open" title="设置" @click="open = !open">
        <span class="az-dots" :class="{ 'az-dots-open': open }"><i /><i /><i /></span>
      </button>
    </div>
    <div class="az-collapse" :class="{ 'az-collapse-open': open }">
      <div class="min-h-0 overflow-hidden">
        <div class="az-settings">
          <template v-for="setting in module.settings" :key="setting.key">
            <button v-if="setting.type === 'bool'" type="button" class="az-check" role="switch" :aria-checked="config.get<boolean>(module.id, setting.key)" @click="config.toggle(module.id, setting.key)">
              <span>{{ setting.label }}</span>
              <span class="az-switch" :class="{ 'az-switch-on': config.get(module.id, setting.key) }"><i /></span>
            </button>
            <button v-else-if="setting.type === 'mode'" type="button" class="az-mode" :title="`左键下一个，右键上一个`" @click="cycle(setting, 1)" @contextmenu.prevent="cycle(setting, -1)">
              <span>{{ setting.label }}</span><span class="az-mode-value">{{ modeLabel(setting) }}</span>
            </button>
            <div
              v-else class="az-slider az-slider-live" role="slider" tabindex="0"
              :aria-label="setting.label" :aria-valuemin="setting.min" :aria-valuemax="setting.max" :aria-valuenow="config.get<number>(module.id, setting.key)"
              @pointerdown="drag(setting, $event)" @pointermove="drag(setting, $event)"
              @keydown.left.prevent="nudge(setting, -1)" @keydown.right.prevent="nudge(setting, 1)"
            >
              <div class="az-slider-fill" :style="{ width: `${sliderPercent(setting)}%` }" />
              <span class="relative">{{ setting.label }}</span>
              <span class="relative ml-auto tabular-nums">{{ config.get(module.id, setting.key) }}{{ setting.unit }}</span>
            </div>
          </template>
          <button v-if="config.changed(module.id)" type="button" class="az-bind" @click="config.reset(module.id)">
            RESET
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
