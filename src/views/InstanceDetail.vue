<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useInstanceDetail } from '@/composables/useInstanceDetail'

// AzureWare 的节点详情：和首页一样是 ClickGUI 面板。
// 顶部是 TargetHUD 式的节点头；左列是状态 / 系统 / 硬件 / 计费面板，右列是图表面板。
const LoadChart = defineAsyncComponent(() => import('@/components/LoadChart.vue'))
const PingChart = defineAsyncComponent(() => import('@/components/PingChart.vue'))
const ReturnRoutePanel = defineAsyncComponent(() => import('@/components/ReturnRoutePanel.vue'))

const router = useRouter()
const { data, orderedNodes, currentIndex, prevNode, nextNode, switchNode, metricCards, hardwareInfo, systemInfo, storageInfo, gauges, liveInfo, regionName, regionCode } = useInstanceDetail()
</script>

<template>
  <div class="az-detail">
    <div v-if="!data" class="az-panel az-detail-empty">
      <header class="az-panel-header">
        <span>Not found</span>
      </header>
      <div class="p-4 text-sm text-white/70">
        节点不存在或已被删除。
        <button type="button" class="az-bind mt-3 w-full" @click="router.push('/')">
          BACK TO CLICKGUI
        </button>
      </div>
    </div>

    <template v-else>
      <!-- TargetHUD：节点名、状态、CPU 血条、上一台 / 下一台 -->
      <section class="az-target" :class="{ 'az-target-off': !data.online }">
        <button type="button" class="az-icon-button" aria-label="返回首页" title="返回 ClickGUI" @click="router.push('/')">
          <Icon icon="tabler:arrow-left" width="18" />
        </button>
        <img v-if="regionCode" :src="`/images/flags/${regionCode}.svg`" :alt="regionName" class="az-target-flag">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h1 class="truncate">
              {{ data.name }}
            </h1>
            <span class="az-state">{{ data.online ? 'ONLINE' : 'OFFLINE' }}</span>
          </div>
          <div class="az-target-bar" :title="`CPU ${(data.cpu ?? 0).toFixed(1)}%`">
            <i :style="{ width: `${data.online ? Math.max(2, data.cpu ?? 0) : 0}%` }" />
          </div>
          <div class="az-target-sub">
            <span>{{ regionName || '—' }}</span>
            <span v-if="data.online">CPU {{ (data.cpu ?? 0).toFixed(1) }}%</span>
            <span v-for="item in (data.online ? liveInfo.slice(0, 2) : [])" :key="item.label" class="hidden md:inline">{{ item.label }} {{ item.value?.split(' · ')[0] }}</span>
          </div>
        </div>
        <div class="az-target-nav">
          <button type="button" class="az-icon-button" :disabled="!prevNode" :title="prevNode ? `上一台：${prevNode.name}（←）` : ''" aria-label="上一台" @click="switchNode(prevNode)">
            <Icon icon="tabler:chevron-left" width="18" />
          </button>
          <span class="tabular-nums">{{ currentIndex + 1 }} / {{ orderedNodes.length }}</span>
          <button type="button" class="az-icon-button" :disabled="!nextNode" :title="nextNode ? `下一台：${nextNode.name}（→）` : ''" aria-label="下一台" @click="switchNode(nextNode)">
            <Icon icon="tabler:chevron-right" width="18" />
          </button>
        </div>
      </section>

      <div class="az-detail-grid">
        <aside class="az-detail-side">
          <section class="az-panel">
            <header class="az-panel-header">
              <span>Status</span>
            </header>
            <div class="az-settings">
              <template v-if="data.online">
                <div v-for="gauge in gauges" :key="gauge.key" class="az-slider" :class="gauge.percent >= 90 ? 'az-slider-danger' : gauge.percent >= 75 ? 'az-slider-warn' : ''">
                  <div class="az-slider-fill" :style="{ width: `${gauge.percent}%` }" />
                  <span class="relative">{{ gauge.label }}</span>
                  <span class="relative ml-auto tabular-nums">{{ gauge.text }}</span>
                </div>
                <div v-for="item in liveInfo" :key="item.label" class="az-value">
                  <span class="text-white/55">{{ item.label }}</span><span class="truncate text-right">{{ item.value }}</span>
                </div>
              </template>
              <div v-else class="az-value">
                <span class="text-white/55">状态</span><span>节点离线，下方可查看历史数据</span>
              </div>
            </div>
          </section>
          <section class="az-panel">
            <header class="az-panel-header">
              <span>System</span>
            </header>
            <div class="az-settings">
              <div v-for="item in systemInfo" :key="item.label" class="az-value">
                <span class="text-white/55">{{ item.label }}</span><span class="text-right">{{ item.value }}</span>
              </div>
            </div>
          </section>
          <section class="az-panel">
            <header class="az-panel-header">
              <span>Hardware</span>
            </header>
            <div class="az-settings">
              <div v-for="item in [...hardwareInfo, ...storageInfo]" :key="item.label" class="az-value">
                <span class="text-white/55">{{ item.label }}</span><span class="text-right">{{ item.value }}</span>
              </div>
            </div>
          </section>
          <section class="az-panel">
            <header class="az-panel-header">
              <span>Billing</span>
            </header>
            <div class="az-settings">
              <div v-for="card in metricCards" :key="card.label" class="az-value">
                <span class="text-white/55">{{ card.label }}</span>
                <span class="text-right" :class="card.valueClass">{{ card.value }}<small v-if="card.unit" class="ml-1 text-white/55">{{ card.unit }}</small></span>
              </div>
            </div>
          </section>
        </aside>

        <div class="az-detail-main">
          <section class="az-panel">
            <header class="az-panel-header">
              <span>Load</span>
            </header>
            <div class="az-detail-body">
              <LoadChart :key="data.uuid" :uuid="data.uuid" />
            </div>
          </section>
          <section class="az-panel">
            <header class="az-panel-header">
              <span>Latency</span>
            </header>
            <div class="az-detail-body">
              <PingChart :key="data.uuid" :uuid="data.uuid" :online="data.online" :last-seen="data.time" />
            </div>
          </section>
          <section class="az-panel">
            <header class="az-panel-header">
              <span>Return route</span>
            </header>
            <div class="az-detail-body">
              <ReturnRoutePanel :key="data.uuid" :uuid="data.uuid" :online="data.online" />
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
