<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { computed } from 'vue'
import { useVisualConfig } from '@/azure/config'
import { useAppStore } from '@/stores/app'
import { formatBytesPerSecondWithConfig } from '@/utils/helper'

// 客户端 ArrayList：已启用（在线）的模块排成一列，右侧一条随位置变色的色条。
// 后缀、排序、配色、背景和行数都来自 Visual → ArrayList 的设置。
const props = defineProps<{ nodes: NodeData[] }>()
const emit = defineEmits<{ open: [uuid: string] }>()
const appStore = useAppStore()
const config = useVisualConfig()

const memory = (node: NodeData) => node.mem_total > 0 ? (node.ram ?? 0) / node.mem_total * 100 : 0
function suffix(node: NodeData): string {
  const mode = config.get<string>('arraylist', 'suffix')
  if (mode === 'none')
    return ''
  if (mode === 'ram')
    return `${memory(node).toFixed(0)}%`
  if (mode === 'net')
    return formatBytesPerSecondWithConfig((node.net_in ?? 0) + (node.net_out ?? 0), appStore.byteDecimals)
  return `${(node.cpu ?? 0).toFixed(0)}%`
}
const rows = computed(() => {
  const sort = config.get<string>('arraylist', 'sort')
  const list = props.nodes.filter(node => node.online)
  if (sort === 'name')
    list.sort((a, b) => a.name.localeCompare(b.name))
  else if (sort === 'load')
    list.sort((a, b) => Math.max(b.cpu ?? 0, memory(b)) - Math.max(a.cpu ?? 0, memory(a)) || a.name.localeCompare(b.name))
  // 按名字长度排（不含会跳动的后缀），列表才不会每次刷新都重排
  else list.sort((a, b) => b.name.length - a.name.length || a.name.localeCompare(b.name))
  return list.slice(0, config.get<number>('arraylist', 'rows')).map(node => ({ uuid: node.uuid, name: node.name, suffix: suffix(node) }))
})
</script>

<template>
  <TransitionGroup
    tag="ol" name="az-arraylist" class="az-arraylist" aria-label="在线节点"
    :data-color="config.get('arraylist', 'color')" :data-background="config.get('arraylist', 'background')" :data-bar="config.get('arraylist', 'bar')"
  >
    <li v-for="(row, index) in rows" :key="row.uuid" :style="{ '--az-i': index }">
      <button type="button" :title="`查看 ${row.name}`" @click="emit('open', row.uuid)">
        {{ row.name }} <span v-if="row.suffix" class="az-arraylist-suffix">{{ row.suffix }}</span>
      </button>
    </li>
  </TransitionGroup>
</template>
