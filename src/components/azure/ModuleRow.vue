<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useNodesStore } from '@/stores/nodes'
import { formatBytesPerSecondWithConfig, formatBytesWithConfig, formatRelativeTime, formatUptimeWithFormat } from '@/utils/helper'
import { nodeTrafficUsed } from '@/utils/nodeHealth'
import { getOSName } from '@/utils/osImageHelper'
import { getRegionCode } from '@/utils/regionHelper'

// 一个节点 = 一个“模块”：在线即启用（高亮），点击展开“设置”——用滑条样式展示各项占用
const props = defineProps<{ node: NodeData, expanded: boolean }>()
const emit = defineEmits<{ toggle: [], open: [] }>()

const appStore = useAppStore()
const nodesStore = useNodesStore()
const bytes = (value: number) => formatBytesWithConfig(value, appStore.byteDecimals)
const speed = (value: number) => formatBytesPerSecondWithConfig(value, appStore.byteDecimals)
const ratio = (used: number, total: number) => total > 0 ? Math.min(100, used / total * 100) : 0

const sliders = computed(() => {
  const node = props.node
  const trafficUsed = nodeTrafficUsed(node)
  const list = [
    { label: 'CPU', percent: node.cpu ?? 0, value: `${(node.cpu ?? 0).toFixed(1)}%` },
    { label: 'RAM', percent: ratio(node.ram ?? 0, node.mem_total), value: `${bytes(node.ram ?? 0)} / ${bytes(node.mem_total ?? 0)}` },
    { label: 'Disk', percent: ratio(node.disk ?? 0, node.disk_total), value: `${bytes(node.disk ?? 0)} / ${bytes(node.disk_total ?? 0)}` },
  ]
  if (node.traffic_limit > 0)
    list.push({ label: 'Traffic', percent: ratio(trafficUsed, node.traffic_limit), value: `${bytes(trafficUsed)} / ${bytes(node.traffic_limit)}` })
  return list
})
const values = computed(() => {
  const node = props.node
  return [
    ['Upload', `${speed(node.net_out ?? 0)} · ${bytes(node.net_total_up ?? 0)}`],
    ['Download', `${speed(node.net_in ?? 0)} · ${bytes(node.net_total_down ?? 0)}`],
    ['Load', `${(node.load ?? 0).toFixed(2)} / ${(node.load5 ?? 0).toFixed(2)} / ${(node.load15 ?? 0).toFixed(2)}`],
    ['Conns', `TCP ${node.connections ?? 0} · UDP ${node.connections_udp ?? 0}`],
    ['Uptime', formatUptimeWithFormat(node.uptime ?? 0, 'hour')],
    ['System', `${getOSName(node.os)} · ${node.cpu_cores}C · ${node.arch}`],
  ]
})
const lastSeen = computed(() => formatRelativeTime(props.node.time, nodesStore.now))
const brief = computed(() => props.node.online ? `${(props.node.cpu ?? 0).toFixed(0)}%` : 'OFF')
</script>

<template>
  <div class="az-module" :class="{ 'az-module-on': node.online, 'az-module-open': expanded }">
    <div class="az-module-row">
      <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left" :aria-expanded="expanded" :title="node.name" @click="emit('toggle')">
        <img v-if="node.region?.trim()" :src="`/images/flags/${getRegionCode(node.region)}.svg`" alt="" class="size-3.5 shrink-0 opacity-90">
        <span class="truncate">{{ node.name }}</span>
        <span class="ml-auto shrink-0 text-[11px] tabular-nums opacity-70">{{ brief }}</span>
      </button>
      <button type="button" class="az-icon-button" :aria-label="`打开 ${node.name} 详情`" title="详情与历史图表" @click="emit('open')">
        <Icon icon="tabler:arrow-up-right" width="14" />
      </button>
    </div>
    <div v-if="expanded" class="az-settings">
      <template v-if="node.online">
        <div v-for="slider in sliders" :key="slider.label" class="az-slider" :class="slider.percent >= 90 ? 'az-slider-danger' : slider.percent >= 75 ? 'az-slider-warn' : ''">
          <div class="az-slider-fill" :style="{ width: `${slider.percent}%` }" />
          <span class="relative">{{ slider.label }}</span>
          <span class="relative ml-auto tabular-nums">{{ slider.value }}</span>
        </div>
        <div v-for="item in values" :key="item[0]" class="az-value">
          <span class="text-white/50">{{ item[0] }}</span><span class="truncate text-right">{{ item[1] }}</span>
        </div>
      </template>
      <div v-else class="az-value">
        <span class="text-white/50">Last seen</span><span>{{ lastSeen !== '-' ? lastSeen : '未知' }}</span>
      </div>
      <button type="button" class="az-bind" @click="emit('open')">
        OPEN DETAILS
      </button>
    </div>
  </div>
</template>
