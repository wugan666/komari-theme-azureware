<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { formatBytesPerSecondWithConfig } from '@/utils/helper'

// 客户端 ArrayList：已启用（在线）的模块按文字长度从长到短排列，右侧一条随位置渐变的色条
const props = defineProps<{ nodes: NodeData[] }>()
const emit = defineEmits<{ open: [uuid: string] }>()
const appStore = useAppStore()

function suffix(node: NodeData): string {
  if (appStore.arrayListSuffix === 'ram')
    return `${(node.mem_total > 0 ? (node.ram ?? 0) / node.mem_total * 100 : 0).toFixed(0)}%`
  if (appStore.arrayListSuffix === 'net')
    return formatBytesPerSecondWithConfig((node.net_in ?? 0) + (node.net_out ?? 0), appStore.byteDecimals)
  return `${(node.cpu ?? 0).toFixed(0)}%`
}
// 按名字长度排序（不含会跳动的后缀），列表才不会每次刷新都重排
const rows = computed(() => props.nodes
  .filter(node => node.online)
  .map(node => ({ uuid: node.uuid, name: node.name, suffix: suffix(node) }))
  .sort((a, b) => b.name.length - a.name.length || a.name.localeCompare(b.name))
  .slice(0, 40))
</script>

<template>
  <ol class="az-arraylist" aria-label="在线节点">
    <li v-for="(row, index) in rows" :key="row.uuid" :style="{ '--az-i': index }">
      <button type="button" :title="`查看 ${row.name}`" @click="emit('open', row.uuid)">
        {{ row.name }} <span class="text-white/55">{{ row.suffix }}</span>
      </button>
    </li>
  </ol>
</template>
