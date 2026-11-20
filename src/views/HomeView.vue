<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { useEventListener, useResizeObserver, useStorage, useWindowSize } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ClickPanel from '@/components/azure/ClickPanel.vue'
import ModuleRow from '@/components/azure/ModuleRow.vue'
import VisualModule from '@/components/azure/VisualModule.vue'
import { useVisualConfig, VISUAL_MODULES } from '@/azure/config'
import { useAppStore } from '@/stores/app'
import { useNodesStore } from '@/stores/nodes'
import { parseNodeGroups } from '@/utils/groupHelper'
import { getRegionDisplayName } from '@/utils/regionHelper'

defineOptions({ name: 'HomeView' })

const appStore = useAppStore()
const nodesStore = useNodesStore()
const router = useRouter()
const { width } = useWindowSize()

const PANEL_WIDTH = 264
const PANEL_GAP = 14

// ===== 面板内容：一个分组（或地区）一个面板 =====
function matches(node: NodeData, keyword: string): boolean {
  if (!keyword)
    return true
  return [node.name, node.os, node.group, node.tags, getRegionDisplayName(node.region)]
    .some(text => text?.toLowerCase().includes(keyword))
}
const config = useVisualConfig()
const VISUAL_PANEL = 'Visual'
const nodePanels = computed(() => {
  const keyword = appStore.nodeSearchText.trim().toLowerCase()
  const nodes = nodesStore.nodes
  const useGroups = appStore.panelGroupBy === 'group' && nodes.some(node => parseNodeGroups(node.group).length)
  const map = new Map<string, NodeData[]>()
  for (const node of nodes) {
    const names = useGroups
      ? parseNodeGroups(node.group)
      : [getRegionDisplayName(node.region) || '']
    for (const name of names.length ? names : ['']) {
      const key = name || (useGroups ? '未分组' : '其他地区')
      if (!map.has(key))
        map.set(key, [])
      map.get(key)!.push(node)
    }
  }
  return [...map.entries()]
    .map(([name, list]) => {
      const sorted = [...list].sort((a, b) => Number(b.online) - Number(a.online) || a.weight - b.weight || a.name.localeCompare(b.name))
      return { name, total: list.length, online: list.filter(node => node.online).length, nodes: sorted.filter(node => matches(node, keyword)) }
    })
    .filter(panel => panel.nodes.length || !keyword)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
})

// Visual 面板排第一：里面是界面自身的模块（HUD / ArrayList / ClickGUI / Backdrop）
const panels = computed(() => [
  {
    name: VISUAL_PANEL,
    total: VISUAL_MODULES.length,
    online: VISUAL_MODULES.filter(module => config.get<boolean>(module.id, 'enabled')).length,
    nodes: [] as NodeData[],
    rows: VISUAL_MODULES.length,
  },
  ...nodePanels.value.map(panel => ({ ...panel, rows: panel.nodes.length })),
])

// ===== 面板位置 =====
// 没被拖动过的面板自动排成几列，并按实际高度实时重排：展开某个模块的设置时，
// 同一列下面的面板会被推下去而不是被盖住。拖动过的面板固定在拖到的位置。
const pins = useStorage<Record<string, [number, number]>>('azureware:pins', {})
const collapsedPanels = useStorage<string[]>('azureware:collapsed', [])
const heights = ref<Record<string, number>>({})
const order = ref<string[]>([])
const floating = computed(() => width.value >= 768)
const stage = ref<HTMLElement>()
const stageWidth = ref(0)
useResizeObserver(stage, ([entry]) => {
  stageWidth.value = entry?.contentRect.width ?? 0
})

function estimateHeight(rows: number): number {
  return 40 + Math.min(rows, 14) * 30 + 10
}
const positions = computed(() => {
  const available = stageWidth.value || width.value
  const columns = Math.max(1, Math.floor((available + PANEL_GAP) / (PANEL_WIDTH + PANEL_GAP)))
  const columnHeights = Array.from({ length: columns }, () => 0)
  const result: Record<string, [number, number]> = {}
  for (const panel of panels.value) {
    const pin = pins.value[panel.name]
    if (pin) {
      result[panel.name] = pin
      continue
    }
    const column = columnHeights.indexOf(Math.min(...columnHeights))
    result[panel.name] = [column * (PANEL_WIDTH + PANEL_GAP), columnHeights[column]!]
    columnHeights[column] = columnHeights[column]! + (heights.value[panel.name] ?? estimateHeight(panel.rows)) + PANEL_GAP
  }
  return { result, bottom: Math.max(...columnHeights, ...Object.entries(pins.value).map(([name, pin]) => pin[1] + (heights.value[name] ?? 0))) }
})
function position(name: string): [number, number] {
  return positions.value.result[name] ?? [0, 0]
}
function setHeight(name: string, height: number) {
  if (heights.value[name] !== height)
    heights.value = { ...heights.value, [name]: height }
}
function movePanel(name: string, x: number, y: number) {
  pins.value = { ...pins.value, [name]: [x, y] }
}
function isCollapsed(name: string): boolean {
  return collapsedPanels.value.includes(name)
}
function togglePanel(name: string) {
  collapsedPanels.value = isCollapsed(name) ? collapsedPanels.value.filter(item => item !== name) : [...collapsedPanels.value, name]
}
function focusPanel(name: string) {
  order.value = [...order.value.filter(item => item !== name), name]
}
function resetLayout() {
  pins.value = {}
  collapsedPanels.value = []
  expanded.value = new Set()
  window.$message?.success('面板位置已重置')
}

// ===== 模块展开 =====
const expanded = ref(new Set<string>())
function toggleModule(panel: string, key: string) {
  // 展开后面板会变高，可能盖住下面的面板：把它提到最上层
  focusPanel(panel)
  const next = new Set(expanded.value)
  next.has(key) ? next.delete(key) : next.add(key)
  expanded.value = next
}
function openNode(uuid: string) {
  router.push(`/instance/${uuid}`)
}

// ClickGUI 自己也是一个模块：在 Visual 里左键关掉，或按右 Shift 开关
const guiVisible = computed(() => config.get<boolean>('clickgui', 'enabled'))
useEventListener('keydown', (event: KeyboardEvent) => {
  if (event.code === 'ShiftRight' && !event.repeat)
    config.toggle('clickgui')
})

defineExpose({ resetLayout })
</script>

<template>
  <div class="px-3 pb-24 pt-3 md:px-5" :class="config.get('arraylist', 'enabled') ? 'xl:pr-[272px]' : ''">
    <div class="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
      <span>左键：开关 / 展开 · 右键：设置</span>
      <span class="hidden md:inline">· 拖动标题栏：移动面板 · 右键标题：折叠 · 右 Shift：开关 ClickGUI</span>
      <button type="button" class="az-chip ml-auto" @click="resetLayout">
        重置布局
      </button>
    </div>
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 scale-[0.98]" leave-active-class="transition duration-150" leave-to-class="opacity-0 scale-[0.98]">
      <div v-show="guiVisible" ref="stage" class="az-stage" :class="floating ? 'az-stage-floating' : ''" :style="floating ? { minHeight: `${positions.bottom}px` } : undefined">
        <ClickPanel
          v-for="(panel, panelIndex) in panels" :key="panel.name" :index="panelIndex"
          :title="panel.name" :online="panel.online" :total="panel.total"
          :x="position(panel.name)[0]" :y="position(panel.name)[1]" :z="10 + order.indexOf(panel.name)"
          :collapsed="isCollapsed(panel.name)" :floating="floating" :pinned="panel.name in pins"
          @resize="height => setHeight(panel.name, height)"
          @move="(x, y) => movePanel(panel.name, x, y)" @focus="focusPanel(panel.name)" @toggle="togglePanel(panel.name)"
        >
          <template v-if="panel.name === VISUAL_PANEL">
            <VisualModule v-for="module in VISUAL_MODULES" :key="module.id" :module="module" />
          </template>
          <ModuleRow
            v-for="node in panel.nodes" :key="node.uuid" :node="node"
            :expanded="expanded.has(`${panel.name}/${node.uuid}`)"
            @toggle="toggleModule(panel.name, `${panel.name}/${node.uuid}`)" @open="openNode(node.uuid)"
          />
          <div v-if="!panel.nodes.length && panel.name !== VISUAL_PANEL" class="px-3 py-2 text-xs text-white/40">
            没有匹配的节点
          </div>
        </ClickPanel>
        <div v-if="!panels.length" class="py-16 text-center text-sm text-white/50">
          {{ nodesStore.nodes.length ? '没有匹配的节点' : '暂无节点' }}
        </div>
      </div>
    </Transition>
    <div v-if="!guiVisible" class="flex flex-col items-center gap-3 py-24 text-sm text-white/45">
      <span>ClickGUI 已关闭 · 按右 Shift 重新打开</span>
      <button type="button" class="az-chip" @click="config.toggle('clickgui')">
        打开 ClickGUI
      </button>
    </div>
  </div>
</template>
