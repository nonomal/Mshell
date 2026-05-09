<template>
  <div class="import-panel">
    <label>
      同步数据 URL
      <input v-model="remoteUrl" placeholder="Gist 地址/ID、GitLab Snippet 地址或 raw 地址" />
    </label>
    <label>
      远程访问 Token
      <span class="password-field">
        <input
          v-model="remoteToken"
          :type="showRemoteToken ? 'text' : 'password'"
          placeholder="私有 Gist/Snippet 必填；公开数据可留空"
        />
        <button type="button" class="secondary" @click="showRemoteToken = !showRemoteToken">
          {{ showRemoteToken ? '隐藏' : '显示' }}
        </button>
      </span>
    </label>
    <button type="button" @click="loadRemotePayload">从 URL 读取</button>
    <label>
      同步/备份数据
      <textarea
        v-model="payload"
        rows="10"
        placeholder="粘贴桌面端备份 JSON、.mshell 加密备份内容，或 GitHub/GitLab 同步 JSON"
      />
    </label>
    <label>
      加密密码
      <span class="password-field">
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="同步 JSON 或 .mshell 备份已加密时填写"
        />
        <button type="button" class="secondary" @click="showPassword = !showPassword">
          {{ showPassword ? '隐藏' : '显示' }}
        </button>
      </span>
    </label>
    <button type="button" @click="importPayload">导入到 Android 本地</button>
    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { mobileStore } from '../services/mobile-store'
import { parseBackupOrSyncPayload } from '../services/sync-import'
import { loadRemoteSyncPayload } from '../services/remote-sync'

const emit = defineEmits<{ imported: [] }>()

const remoteUrl = ref('')
const remoteToken = ref('')
const payload = ref('')
const password = ref('')
const showRemoteToken = ref(false)
const showPassword = ref(false)
const message = ref('')

const loadRemotePayload = async () => {
  try {
    if (!remoteUrl.value.trim()) {
      message.value = '请输入同步数据 URL'
      return
    }

    message.value = '正在读取远程同步数据...'
    const remote = await loadRemoteSyncPayload(remoteUrl.value, remoteToken.value || undefined)
    payload.value = remote.text
    message.value =
      remote.source === 'github-gist'
        ? '已从 GitHub Gist 读取同步数据，可以继续导入'
        : remote.source === 'gitlab-snippet'
          ? '已从 GitLab Snippet 读取同步数据，可以继续导入'
          : '同步数据已读取，可以继续导入'
  } catch (error: any) {
    message.value = error.message || '读取远程数据失败'
  }
}

const importPayload = async () => {
  try {
    if (!payload.value.trim()) {
      message.value = '请先粘贴要导入的数据'
      return
    }

    const data = await parseBackupOrSyncPayload(payload.value, password.value || undefined)
    const nextState = mobileStore.importBackup(data)
    message.value = `导入完成：${nextState.sessions.length} 会话，${nextState.snippets.length} 片段，${nextState.sshKeys.length} 密钥`
    emit('imported')
  } catch (error: any) {
    message.value = error.message || '导入失败'
  }
}
</script>
