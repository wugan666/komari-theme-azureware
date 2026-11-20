import { useStorage } from '@vueuse/core'
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

// The "Visual" modules of the ClickGUI. Each visitor's changes are kept in
// their browser; anything they have not touched follows the theme settings
// the site owner chose in the Komari admin.

export type SettingDef
  = | { key: string, label: string, type: 'bool' }
    | { key: string, label: string, type: 'mode', options: [value: string, label: string][] }
    | { key: string, label: string, type: 'slider', min: number, max: number, step: number, unit: string }

export interface VisualModuleDef {
  id: 'hud' | 'arraylist' | 'clickgui' | 'backdrop'
  name: string
  description: string
  settings: SettingDef[]
}

export const VISUAL_MODULES: VisualModuleDef[] = [
  {
    id: 'hud',
    name: 'HUD',
    description: '顶栏里的在线数、网速、流量和时钟',
    settings: [
      { key: 'online', label: 'Online count', type: 'bool' },
      { key: 'speed', label: 'Net speed', type: 'bool' },
      { key: 'traffic', label: 'Total traffic', type: 'bool' },
      { key: 'clock', label: 'Clock', type: 'bool' },
      { key: 'sitename', label: 'Site name', type: 'bool' },
    ],
  },
  {
    id: 'arraylist',
    name: 'ArrayList',
    description: '宽屏右上角的在线节点列表',
    settings: [
      { key: 'suffix', label: 'Suffix', type: 'mode', options: [['cpu', 'CPU'], ['ram', 'RAM'], ['net', 'Net'], ['none', 'None']] },
      { key: 'sort', label: 'Sort', type: 'mode', options: [['length', 'Length'], ['name', 'Name'], ['load', 'Load']] },
      { key: 'color', label: 'Color', type: 'mode', options: [['gradient', 'Gradient'], ['rainbow', 'Rainbow'], ['static', 'Static']] },
      { key: 'background', label: 'Background', type: 'bool' },
      { key: 'bar', label: 'Side bar', type: 'bool' },
      { key: 'rows', label: 'Max rows', type: 'slider', min: 5, max: 60, step: 1, unit: '' },
    ],
  },
  {
    id: 'clickgui',
    name: 'ClickGUI',
    description: '这些面板本身。关闭后按右 Shift 重新打开',
    settings: [
      { key: 'accent', label: 'Accent', type: 'mode', options: [['azure', 'Azure'], ['cyan', 'Cyan'], ['violet', 'Violet'], ['rose', 'Rose'], ['mint', 'Mint']] },
      { key: 'header', label: 'Header', type: 'mode', options: [['gradient', 'Gradient'], ['flat', 'Flat'], ['rainbow', 'Rainbow']] },
      { key: 'opacity', label: 'Opacity', type: 'slider', min: 55, max: 100, step: 1, unit: '%' },
      { key: 'rounding', label: 'Rounding', type: 'slider', min: 0, max: 14, step: 1, unit: 'px' },
      { key: 'animations', label: 'Animations', type: 'bool' },
    ],
  },
  {
    id: 'backdrop',
    name: 'Backdrop',
    description: '背景的光晕与网格',
    settings: [
      { key: 'glow', label: 'Glow', type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'drift', label: 'Drift', type: 'bool' },
      { key: 'grid', label: 'Grid', type: 'bool' },
    ],
  },
]

type Values = Record<string, boolean | string | number>
type Overrides = Record<string, Values>

const overrides = useStorage<Overrides>('azureware:visual', {})

export function useVisualConfig() {
  const appStore = useAppStore()
  const defaults = computed<Record<string, Values>>(() => ({
    hud: { enabled: true, online: true, speed: true, traffic: true, clock: true, sitename: true },
    arraylist: { enabled: appStore.showArrayList, suffix: appStore.arrayListSuffix, sort: 'length', color: 'gradient', background: true, bar: true, rows: 40 },
    clickgui: { enabled: true, accent: appStore.accentColor, header: 'gradient', opacity: 93, rounding: 8, animations: true },
    backdrop: { enabled: true, glow: 50, drift: true, grid: true },
  }))
  /** effective value: the visitor's override, else the site default */
  function get<T extends boolean | string | number>(module: string, key: string): T {
    return (overrides.value[module]?.[key] ?? defaults.value[module]?.[key]) as T
  }
  function set(module: string, key: string, value: boolean | string | number) {
    overrides.value = { ...overrides.value, [module]: { ...overrides.value[module], [key]: value } }
  }
  function toggle(module: string, key = 'enabled') {
    set(module, key, !get<boolean>(module, key))
  }
  /** forget this visitor's changes to one module */
  function reset(module: string) {
    const next = { ...overrides.value }
    delete next[module]
    overrides.value = next
  }
  const changed = (module: string) => Object.keys(overrides.value[module] ?? {}).some(key => key !== 'enabled')
  return { get, set, toggle, reset, changed }
}
