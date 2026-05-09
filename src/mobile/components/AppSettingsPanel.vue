<template>
  <section class="app-settings-panel">
    <div class="section-head">
      <div>
        <h2>终端设置</h2>
        <p>{{ modeText }}</p>
      </div>
    </div>

    <label>
      输入模式
      <select v-model="localSettings.terminalInputMode" @change="saveSettings">
        <option value="command-box">多行命令框</option>
        <option value="direct-terminal">直接终端输入</option>
      </select>
    </label>

    <p v-if="message" class="message">{{ message }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { MobileAppSettings } from '../services/app-settings'
import { appSettingsStore } from '../services/app-settings'

const props = defineProps<{ settings: MobileAppSettings }>()
const emit = defineEmits<{ updated: [settings: MobileAppSettings] }>()

const localSettings = reactive<MobileAppSettings>({ ...props.settings })
const message = computed(() =>
  localSettings.terminalInputMode === 'direct-terminal'
    ? '直接输入会把按键发送到远端 shell，适合交互式操作。'
    : '多行命令框支持 Enter 换行，Ctrl/⌘ + Enter 执行。'
)
const modeText = computed(() =>
  localSettings.terminalInputMode === 'direct-terminal'
    ? '当前使用直接终端输入'
    : '当前使用多行命令框'
)

watch(
  () => props.settings,
  (settings) => {
    Object.assign(localSettings, settings)
  },
  { deep: true }
)

const saveSettings = () => {
  emit('updated', appSettingsStore.update(localSettings))
}
</script>
