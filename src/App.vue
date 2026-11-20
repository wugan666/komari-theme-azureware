<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useNow } from '@vueuse/core'
import { computed, onMounted, onUnmounted, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArrayList from '@/components/azure/ArrayList.vue'
import { Toaster } from '@/components/ui/sonner'
import { useAppStore } from '@/stores/app'
import { useNodesStore } from '@/stores/nodes'
import { formatBytesPerSecondWithConfig, formatBytesWithConfig } from '@/utils/helper'
import { destroyInitManager, initApp } from '@/utils/init'
import ConnectionBanner from './components/ConnectionBanner.vue'
import LoadingCover from './components/LoadingCover.vue'
import Provider from './components/Provider.vue'

const appStore = useAppStore()
const nodesStore = useNodesStore()
const route = useRoute()
const router = useRouter()
const now = useNow({ interval: 1000 })

const sitename = computed(() => appStore.publicSettings?.sitename || 'Komari Monitor')
const online = computed(() => nodesStore.nodes.filter(node => node.online))
const totals = computed(() => {
  let up = 0
  let down = 0
  let traffic = 0
  for (const node of nodesStore.nodes) {
    traffic += (node.net_total_up || 0) + (node.net_total_down || 0)
    if (node.online) {
      up += node.net_out || 0
      down += node.net_in || 0
    }
  }
  return {
    up: formatBytesPerSecondWithConfig(up, appStore.byteDecimals),
    down: formatBytesPerSecondWithConfig(down, appStore.byteDecimals),
    traffic: formatBytesWithConfig(traffic, appStore.byteDecimals),
  }
})
const clock = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: false }))
const showAdmin = computed(() => appStore.isLoggedIn || !appStore.hideAdminEntryWhenLoggedOut)
const isHome = computed(() => route.name === 'home')
const buildVersion = __BUILD_VERSION__

watchEffect(() => {
  document.documentElement.dataset.accent = appStore.accentColor
})
watchEffect(() => {
  const total = nodesStore.nodes.length
  document.title = total > 0 ? `${sitename.value} · ${online.value.length}/${total} 在线` : sitename.value
})

function openAdmin() {
  location.href = appStore.isLoggedIn ? '/admin/dashboard' : '/admin/login'
}

onMounted(async () => {
  try {
    await initApp()
  }
  catch (error) {
    console.error('[App] Initialization failed:', error)
  }
})
onUnmounted(() => destroyInitManager())
</script>

<template>
  <Provider>
    <div class="az-backdrop" aria-hidden="true">
      <i /><i /><i />
    </div>
    <LoadingCover v-if="appStore.loading" />
    <header class="az-hud">
      <button type="button" class="az-watermark" aria-label="返回首页" @click="router.push('/')">
        <span class="az-logo">AzureWare</span>
        <span class="hidden truncate text-white/75 sm:inline">{{ sitename }}</span>
      </button>
      <div class="az-hud-stats">
        <span><b>{{ online.length }}</b>/{{ nodesStore.nodes.length }} online</span>
        <span class="hidden md:inline">↑ {{ totals.up }}</span>
        <span class="hidden md:inline">↓ {{ totals.down }}</span>
        <span class="hidden lg:inline">Σ {{ totals.traffic }}</span>
        <span class="hidden sm:inline tabular-nums">{{ clock }}</span>
      </div>
      <span class="flex-1" />
      <label v-if="isHome" class="az-search">
        <Icon icon="tabler:search" width="14" class="shrink-0 text-white/50" />
        <input v-model="appStore.nodeSearchText" type="search" placeholder="Search modules…" aria-label="搜索节点">
      </label>
      <button v-if="showAdmin" type="button" class="az-icon-button" aria-label="后台管理" title="后台管理" @click="openAdmin">
        <Icon icon="tabler:settings" width="16" />
      </button>
    </header>
    <ConnectionBanner />
    <ArrayList v-if="!appStore.loading && appStore.showArrayList && isHome" class="hidden xl:block" :nodes="nodesStore.nodes" @open="uuid => router.push(`/instance/${uuid}`)" />
    <main v-if="!appStore.loading" class="relative z-10 min-h-[calc(100vh-3rem)]">
      <RouterView v-slot="{ Component }">
        <KeepAlive :include="['HomeView']">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>
    <footer v-if="!appStore.loading" class="az-footer">
      Powered by <a href="https://github.com/komari-monitor/komari" target="_blank" rel="noopener">Komari</a>
      · <a href="https://github.com/wugan666/komari-theme-azureware" target="_blank" rel="noopener">AzureWare</a> v{{ buildVersion }}
    </footer>
    <Toaster rich-colors close-button position="top-center" theme="dark" />
  </Provider>
</template>
