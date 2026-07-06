<template>
  <div class="port-forward-panel">
    <div class="panel-header">
      <h3>端口转发管理</h3>
      <el-button type="primary" :icon="Plus" @click="showAddDialog = true">
        添加转发
      </el-button>
    </div>

    <div class="forward-list">
      <el-table :data="forwards" style="width: 100%" v-loading="loading">
        <el-table-column label="类型" prop="type" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="本地地址" width="200">
          <template #default="{ row }">
            {{ row.localHost }}:{{ row.localPort }}
          </template>
        </el-table-column>
        <el-table-column label="远程地址" width="200">
          <template #default="{ row }">
            <span v-if="row.type !== 'dynamic'">
              {{ row.remoteHost }}:{{ row.remotePort }}
            </span>
            <span v-else class="text-muted">SOCKS5 代理</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="描述" prop="description" min-width="200" />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'inactive'"
              size="small"
              type="primary"
              @click="startForward(row)"
            >
              启动
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              size="small"
              type="warning"
              @click="stopForward(row)"
            >
              停止
            </el-button>
            <el-button
              size="small"
              @click="openSystemPersistence(row)"
            >
              系统持久化
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteForward(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 添加转发对话框 -->
    <el-dialog
      v-model="showAddDialog"
      title="添加端口转发"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="转发类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="local">本地转发</el-radio>
            <el-radio value="remote">远程转发</el-radio>
            <el-radio value="dynamic">动态转发</el-radio>
          </el-radio-group>
          <div class="form-help">
            <div v-if="form.type === 'local'">
              本地端口 → SSH服务器 → 远程地址
            </div>
            <div v-if="form.type === 'remote'">
              远程端口 → SSH服务器 → 本地地址
            </div>
            <div v-if="form.type === 'dynamic'">
              本地SOCKS5代理 → SSH服务器 → 任意地址
            </div>
          </div>
        </el-form-item>

        <el-form-item label="本地主机" prop="localHost">
          <el-input v-model="form.localHost" placeholder="127.0.0.1" />
        </el-form-item>

        <el-form-item label="本地端口" prop="localPort">
          <el-input-number
            v-model="form.localPort"
            :min="1"
            :max="65535"
            placeholder="8080"
          />
        </el-form-item>

        <template v-if="form.type !== 'dynamic'">
          <el-form-item label="远程主机" prop="remoteHost">
            <el-input v-model="form.remoteHost" placeholder="localhost" />
          </el-form-item>

          <el-form-item label="远程端口" prop="remotePort">
            <el-input-number
              v-model="form.remotePort"
              :min="1"
              :max="65535"
              placeholder="3306"
            />
          </el-form-item>
        </template>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="例如：MySQL数据库转发"
          />
        </el-form-item>

        <el-form-item label="自动启动">
          <el-switch v-model="form.autoStart" />
          <span class="form-help">连接SSH时自动启动此转发</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">添加</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showSystemPersistenceDialog"
      title="系统级持久化预检"
      width="860px"
      class="system-persistence-dialog"
    >
      <div v-loading="systemPersistenceLoading" class="system-persistence">
        <template v-if="systemPersistencePlan">
          <div class="system-persistence-summary">
            <el-tag :type="systemPersistencePlan.supported ? 'success' : 'danger'">
              {{ systemPersistencePlan.supported ? '可生成系统级脚本' : '暂不能直接持久化' }}
            </el-tag>
            <span>{{ getPlatformLabel(systemPersistencePlan.platform) }}</span>
          </div>

          <div v-if="systemPersistenceStatus" class="system-persistence-status">
            <el-tag :type="systemPersistenceStatus.installed ? 'success' : 'info'">
              {{ systemPersistenceStatus.installed ? '已安装' : '未安装' }}
            </el-tag>
            <el-tag :type="systemPersistenceStatus.running ? 'success' : 'warning'">
              {{ systemPersistenceStatus.running ? '运行中' : '未运行' }}
            </el-tag>
            <span>{{ systemPersistenceStatus.details || '暂无状态详情' }}</span>
          </div>

          <div v-if="systemPersistencePlan.errors.length" class="system-persistence-issues">
            <el-alert
              v-for="error in systemPersistencePlan.errors"
              :key="error"
              type="error"
              :title="error"
              show-icon
              :closable="false"
            />
          </div>

          <div v-if="systemPersistencePlan.warnings.length" class="system-persistence-issues">
            <el-alert
              v-for="warning in systemPersistencePlan.warnings"
              :key="warning"
              type="warning"
              :title="warning"
              show-icon
              :closable="false"
            />
          </div>

          <el-tabs v-model="systemPersistenceTab" class="system-persistence-tabs">
            <el-tab-pane label="当前系统" name="current" />
            <el-tab-pane label="SSH 命令" name="ssh" />
            <el-tab-pane label="Windows" name="windows" />
            <el-tab-pane label="Linux" name="linux" />
            <el-tab-pane label="macOS" name="macos" />
          </el-tabs>

          <div class="system-persistence-script-head">
            <span>{{ getSystemPersistenceScriptTitle(systemPersistenceTab) }}</span>
            <div class="system-persistence-script-actions">
              <el-radio-group
                v-if="systemPersistenceTab !== 'ssh'"
                v-model="systemPersistenceScriptMode"
                size="small"
              >
                <el-radio-button value="install">安装</el-radio-button>
                <el-radio-button value="uninstall">卸载</el-radio-button>
              </el-radio-group>
              <el-button size="small" @click="copySystemPersistenceScript">复制</el-button>
            </div>
          </div>
          <pre class="system-persistence-code">{{ getSystemPersistenceScript(systemPersistenceTab) }}</pre>

          <div v-if="systemPersistenceLastOutput" class="system-persistence-output">
            <div class="system-persistence-output-title">执行输出</div>
            <pre>{{ systemPersistenceLastOutput }}</pre>
          </div>
        </template>

        <el-empty
          v-else-if="!systemPersistenceLoading"
          description="暂无系统级持久化预检信息"
          :image-size="96"
        />
      </div>

      <template #footer>
        <el-button @click="showSystemPersistenceDialog = false">关闭</el-button>
        <el-button
          :loading="systemPersistenceActionLoading"
          @click="refreshSystemPersistenceStatus"
        >
          查询状态
        </el-button>
        <el-button
          type="primary"
          :disabled="!systemPersistencePlan?.supported"
          :loading="systemPersistenceActionLoading"
          @click="installSystemPersistence"
        >
          安装到系统
        </el-button>
        <el-button
          type="danger"
          plain
          :loading="systemPersistenceActionLoading"
          @click="uninstallSystemPersistence"
        >
          卸载
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

interface PortForward {
  id: string
  sessionId?: string
  connectionId?: string
  type: 'local' | 'remote' | 'dynamic'
  localHost: string
  localPort: number
  remoteHost: string
  remotePort: number
  status: 'active' | 'inactive' | 'error'
  description?: string
  autoStart?: boolean
}

interface SystemPersistencePlan {
  supported: boolean
  platform: string
  errors: string[]
  warnings: string[]
  sshCommand: string
  windows: {
    taskName: string
    taskPath: string
    fullTaskName: string
    installScript: string
    uninstallScript: string
    statusScript: string
  }
  linux: {
    serviceName: string
    installScript: string
    uninstallScript: string
    statusScript: string
  }
  macos: {
    label: string
    installScript: string
    uninstallScript: string
    statusScript: string
  }
}

interface SystemPersistenceStatus {
  installed: boolean
  running: boolean
  details: string
  stdout: string
  stderr: string
}

interface Props {
  sessionId: string
  connectionId: string
}

const props = defineProps<Props>()

const forwards = ref<PortForward[]>([])
const loading = ref(false)
const showAddDialog = ref(false)
const showSystemPersistenceDialog = ref(false)
const systemPersistenceLoading = ref(false)
const systemPersistenceActionLoading = ref(false)
const systemPersistencePlan = ref<SystemPersistencePlan | null>(null)
const systemPersistenceStatus = ref<SystemPersistenceStatus | null>(null)
const systemPersistenceLastOutput = ref('')
const currentSystemPersistenceForwardId = ref('')
const systemPersistenceTab = ref('current')
const systemPersistenceScriptMode = ref<'install' | 'uninstall'>('install')
const formRef = ref()

const form = ref({
  type: 'local' as 'local' | 'remote' | 'dynamic',
  localHost: '127.0.0.1',
  localPort: 8080,
  remoteHost: 'localhost',
  remotePort: 3306,
  description: '',
  autoStart: false
})

const rules = {
  type: [{ required: true, message: '请选择转发类型', trigger: 'change' }],
  localHost: [{ required: true, message: '请输入本地主机', trigger: 'blur' }],
  localPort: [{ required: true, message: '请输入本地端口', trigger: 'blur' }],
  remoteHost: [
    {
      required: true,
      message: '请输入远程主机',
      trigger: 'blur',
      validator: (_rule: any, value: any, callback: any) => {
        if (form.value.type === 'dynamic') {
          callback()
        } else if (!value) {
          callback(new Error('请输入远程主机'))
        } else {
          callback()
        }
      }
    }
  ],
  remotePort: [
    {
      required: true,
      message: '请输入远程端口',
      trigger: 'blur',
      validator: (_rule: any, value: any, callback: any) => {
        if (form.value.type === 'dynamic') {
          callback()
        } else if (!value) {
          callback(new Error('请输入远程端口'))
        } else {
          callback()
        }
      }
    }
  ]
}

onMounted(() => {
  loadForwards()
})

watch(
  () => props.sessionId,
  () => {
    loadForwards()
  }
)

const loadForwards = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.portForward.getAll(props.sessionId)
    if (result.success) {
      forwards.value = result.forwards || []
    }
  } catch (error: any) {
    ElMessage.error(`加载转发列表失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const handleAdd = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    try {
      const forwardData = {
        type: form.value.type,
        localHost: form.value.localHost,
        localPort: form.value.localPort,
        remoteHost: form.value.remoteHost,
        remotePort: form.value.remotePort,
        description: form.value.description,
        autoStart: form.value.autoStart
      }

      const result = await window.electronAPI.portForward.add(
        props.sessionId,
        props.connectionId,
        forwardData
      )

      if (result.success) {
        ElMessage.success('添加转发成功')
        showAddDialog.value = false
        await loadForwards()
      } else {
        ElMessage.error(`添加转发失败: ${result.error}`)
      }
    } catch (error: any) {
      ElMessage.error(`添加转发失败: ${error.message}`)
    }
  })
}

const startForward = async (forward: PortForward) => {
  try {
    const result = await window.electronAPI.portForward.start(
      props.sessionId,
      props.connectionId,
      forward.id
    )

    if (result.success) {
      ElMessage.success('启动转发成功')
      await loadForwards()
    } else {
      ElMessage.error(`启动转发失败: ${result.error}`)
    }
  } catch (error: any) {
    ElMessage.error(`启动转发失败: ${error.message}`)
  }
}

const stopForward = async (forward: PortForward) => {
  try {
    const result = await window.electronAPI.portForward.stop(
      props.sessionId,
      props.connectionId,
      forward.id
    )

    if (result.success) {
      ElMessage.success('停止转发成功')
      await loadForwards()
    } else {
      ElMessage.error(`停止转发失败: ${result.error}`)
    }
  } catch (error: any) {
    ElMessage.error(`停止转发失败: ${error.message}`)
  }
}

const deleteForward = async (forward: PortForward) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除转发 ${forward.localHost}:${forward.localPort} 吗？`,
      '确认删除',
      { type: 'warning' }
    )

    const result = await window.electronAPI.portForward.delete(
      props.sessionId,
      props.connectionId,
      forward.id
    )

    if (result.success) {
      ElMessage.success('删除转发成功')
      await loadForwards()
    } else {
      ElMessage.error(`删除转发失败: ${result.error}`)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`删除转发失败: ${error.message}`)
    }
  }
}

const openSystemPersistence = async (forward: PortForward) => {
  showSystemPersistenceDialog.value = true
  systemPersistenceLoading.value = true
  systemPersistenceActionLoading.value = false
  systemPersistencePlan.value = null
  systemPersistenceStatus.value = null
  systemPersistenceLastOutput.value = ''
  currentSystemPersistenceForwardId.value = forward.id
  systemPersistenceTab.value = 'current'
  systemPersistenceScriptMode.value = 'install'

  try {
    const result = await window.electronAPI.portForward.getSystemPersistencePlan(
      props.sessionId,
      forward.id
    )

    if (result.success && result.data) {
      systemPersistencePlan.value = result.data
      await refreshSystemPersistenceStatus(false)
    } else {
      ElMessage.error(`生成系统级持久化预检失败: ${result.error || '未知错误'}`)
    }
  } catch (error: any) {
    ElMessage.error(`生成系统级持久化预检失败: ${error.message}`)
  } finally {
    systemPersistenceLoading.value = false
  }
}

const getSystemPersistenceScriptTitle = (tab: string) => {
  const titles: Record<string, string> = {
    current: '当前系统推荐脚本',
    ssh: '直接 SSH 命令',
    windows: 'Windows 计划任务脚本',
    linux: 'Linux systemd user 脚本',
    macos: 'macOS LaunchAgent 脚本'
  }
  const modeLabel = tab === 'ssh' ? '' : ` / ${systemPersistenceScriptMode.value === 'install' ? '安装' : '卸载'}`
  return `${titles[tab] || '脚本'}${modeLabel}`
}

const getSystemPersistenceScript = (tab: string) => {
  const plan = systemPersistencePlan.value
  if (!plan) return ''

  if (tab === 'ssh') return plan.sshCommand
  const scriptKey = systemPersistenceScriptMode.value === 'install' ? 'installScript' : 'uninstallScript'
  if (tab === 'windows') return plan.windows[scriptKey]
  if (tab === 'linux') return plan.linux[scriptKey]
  if (tab === 'macos') return plan.macos[scriptKey]

  if (plan.platform === 'win32') return plan.windows[scriptKey]
  if (plan.platform === 'darwin') return plan.macos[scriptKey]
  return plan.linux[scriptKey]
}

const copySystemPersistenceScript = async () => {
  const script = getSystemPersistenceScript(systemPersistenceTab.value)
  if (!script.trim()) {
    ElMessage.warning('暂无可复制内容')
    return
  }

  await navigator.clipboard.writeText(script)
  ElMessage.success('已复制脚本')
}

const getPlatformLabel = (platform: string) => {
  const labels: Record<string, string> = {
    win32: '当前系统：Windows',
    linux: '当前系统：Linux',
    darwin: '当前系统：macOS'
  }
  return labels[platform] || `当前系统：${platform}`
}

const refreshSystemPersistenceStatus = async (showMessage = true) => {
  if (!currentSystemPersistenceForwardId.value) return

  systemPersistenceActionLoading.value = true
  try {
    const result = await window.electronAPI.portForward.getSystemPersistenceStatus(
      props.sessionId,
      currentSystemPersistenceForwardId.value
    )

    if (result.success && result.data) {
      systemPersistenceStatus.value = result.data
      systemPersistenceLastOutput.value = formatSystemPersistenceOutput(result.data)
      if (showMessage) {
        ElMessage.success('已刷新系统持久化状态')
      }
    } else if (showMessage) {
      ElMessage.error(`查询系统持久化状态失败: ${result.error || '未知错误'}`)
    }
  } catch (error: any) {
    if (showMessage) {
      ElMessage.error(`查询系统持久化状态失败: ${error.message}`)
    }
  } finally {
    systemPersistenceActionLoading.value = false
  }
}

const installSystemPersistence = async () => {
  if (!currentSystemPersistenceForwardId.value || !systemPersistencePlan.value?.supported) return

  await ElMessageBox.confirm(
    '将把该端口转发写入本机系统启动任务，并尝试立即启动。确认继续吗？',
    '安装系统级持久化',
    { type: 'warning' }
  )

  systemPersistenceActionLoading.value = true
  try {
    const result = await window.electronAPI.portForward.installSystemPersistence(
      props.sessionId,
      currentSystemPersistenceForwardId.value
    )

    if (result.success && result.data) {
      systemPersistenceStatus.value = result.data
      systemPersistenceLastOutput.value = formatSystemPersistenceOutput(result.data)
      ElMessage.success('系统级持久化已安装')
    } else {
      systemPersistenceLastOutput.value = result.data
        ? formatSystemPersistenceOutput(result.data)
        : (result.error || '安装系统级持久化失败')
      ElMessage.error(`安装系统级持久化失败: ${result.error || '未知错误'}`)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`安装系统级持久化失败: ${error.message}`)
    }
  } finally {
    systemPersistenceActionLoading.value = false
  }
}

const uninstallSystemPersistence = async () => {
  if (!currentSystemPersistenceForwardId.value) return

  await ElMessageBox.confirm(
    '将从本机系统启动任务中移除该端口转发。确认继续吗？',
    '卸载系统级持久化',
    { type: 'warning' }
  )

  systemPersistenceActionLoading.value = true
  try {
    const result = await window.electronAPI.portForward.uninstallSystemPersistence(
      props.sessionId,
      currentSystemPersistenceForwardId.value
    )

    if (result.success && result.data) {
      systemPersistenceStatus.value = result.data
      systemPersistenceLastOutput.value = formatSystemPersistenceOutput(result.data)
      ElMessage.success('系统级持久化已卸载')
    } else {
      systemPersistenceLastOutput.value = result.data
        ? formatSystemPersistenceOutput(result.data)
        : (result.error || '卸载系统级持久化失败')
      ElMessage.error(`卸载系统级持久化失败: ${result.error || '未知错误'}`)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`卸载系统级持久化失败: ${error.message}`)
    }
  } finally {
    systemPersistenceActionLoading.value = false
  }
}

const formatSystemPersistenceOutput = (data: Partial<SystemPersistenceStatus>) => {
  return [
    data.details,
    data.stdout ? `stdout:\n${data.stdout}` : '',
    data.stderr ? `stderr:\n${data.stderr}` : ''
  ].filter(Boolean).join('\n\n')
}

const resetForm = () => {
  form.value = {
    type: 'local',
    localHost: '127.0.0.1',
    localPort: 8080,
    remoteHost: 'localhost',
    remotePort: 3306,
    description: '',
    autoStart: false
  }
  formRef.value?.resetFields()
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    local: '本地转发',
    remote: '远程转发',
    dynamic: '动态转发'
  }
  return labels[type] || type
}

const getTypeTagType = (type: string) => {
  const types: Record<string, any> = {
    local: 'primary',
    remote: 'success',
    dynamic: 'warning'
  }
  return types[type] || ''
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    active: '运行中',
    inactive: '未启动',
    error: '错误'
  }
  return labels[status] || status
}

const getStatusTagType = (status: string) => {
  const types: Record<string, any> = {
    active: 'success',
    inactive: 'info',
    error: 'danger'
  }
  return types[status] || ''
}
</script>

<style scoped>
.port-forward-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--bg-main);
  color: var(--text-primary);
}

.panel-header {
  padding: 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
}

.forward-list {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.text-muted {
  color: var(--text-tertiary);
  font-style: italic;
}

.form-help {
  margin-top: 8px;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: 1.5;
}

.system-persistence {
  min-height: 220px;
}

.system-persistence-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.system-persistence-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.5;
}

.system-persistence-issues {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.system-persistence-tabs {
  margin-top: 8px;
}

.system-persistence-script-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 10px 0 8px;
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: 600;
}

.system-persistence-script-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.system-persistence-code {
  max-height: 360px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.system-persistence-output {
  margin-top: 12px;
}

.system-persistence-output-title {
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 600;
}

.system-persistence-output pre {
  max-height: 180px;
  margin: 0;
  padding: 10px;
  overflow: auto;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.el-table) {
  background: transparent;
  color: var(--text-primary);
}

:deep(.el-table th.el-table__cell) {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

:deep(.el-table tr) {
  background: transparent;
}

:deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid var(--border-light);
}

:deep(.el-table__body tr:hover > td) {
  background: var(--bg-hover) !important;
}

:global(:root.app-appearance-terminal .port-forward-panel) {
  background: var(--bg-main);
}

:global(:root.app-appearance-terminal .panel-header) {
  padding: 9px 12px;
}

:global(:root.app-appearance-terminal .panel-header h3) {
  font-family: var(--font-mono);
  font-size: var(--text-base);
}

:global(:root.app-appearance-terminal .forward-list) {
  padding: 12px;
}

:global(:root.app-appearance-terminal .form-help) {
  font-size: var(--text-xs);
}
</style>
