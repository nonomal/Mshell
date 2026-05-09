<template>
  <div class="export-panel">
    <label>
      导出加密密码
      <span class="password-field">
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="生成加密备份或加密同步 JSON 时填写"
        />
        <button type="button" class="secondary" @click="showPassword = !showPassword">
          {{ showPassword ? '隐藏' : '显示' }}
        </button>
      </span>
    </label>

    <div class="segmented-actions">
      <button type="button" @click="generateBackupJson">备份 JSON</button>
      <button type="button" @click="generateEncryptedBackup">.mshell 加密</button>
      <button type="button" @click="generateSyncJson">同步 JSON</button>
    </div>

    <label>
      导出内容
      <textarea
        v-model="output"
        class="readonly-output"
        rows="10"
        readonly
        placeholder="生成后会显示在这里"
      />
    </label>

    <div class="form-actions compact">
      <button type="button" :disabled="!output" @click="copyOutput">复制</button>
      <button type="button" class="secondary" :disabled="!output" @click="clearOutput">
        清空
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { mobileStore } from '../services/mobile-store'
import {
  createBackupJson,
  createEncryptedBackupPayload,
  createSyncPayload
} from '../services/sync-export'

const password = ref('')
const showPassword = ref(false)
const output = ref('')
const message = ref('')

const generateBackupJson = () => {
  const data = mobileStore.exportBackup()
  output.value = createBackupJson(data)
  message.value = buildSummary('已生成明文备份 JSON', data)
}

const generateEncryptedBackup = async () => {
  try {
    const data = mobileStore.exportBackup()
    output.value = await createEncryptedBackupPayload(data, password.value)
    message.value = buildSummary('已生成桌面端兼容 .mshell 加密备份', data)
  } catch (error: any) {
    message.value = error.message || '生成加密备份失败'
  }
}

const generateSyncJson = async () => {
  try {
    const data = mobileStore.exportBackup()
    output.value = await createSyncPayload(data, password.value || undefined)
    message.value = buildSummary(
      password.value ? '已生成加密同步 JSON' : '已生成明文同步 JSON',
      data
    )
  } catch (error: any) {
    message.value = error.message || '生成同步 JSON 失败'
  }
}

const copyOutput = async () => {
  try {
    await navigator.clipboard.writeText(output.value)
    message.value = '导出内容已复制'
  } catch {
    message.value = '复制失败，请长按文本框手动选择'
  }
}

const clearOutput = () => {
  output.value = ''
  message.value = ''
}

const buildSummary = (prefix: string, data: ReturnType<typeof mobileStore.exportBackup>): string =>
  `${prefix}：${data.sessions?.length || 0} 会话，${data.snippets?.length || 0} 片段，${data.quickCommands?.length || 0} 快捷命令，${data.sshKeys?.length || 0} 密钥`
</script>
