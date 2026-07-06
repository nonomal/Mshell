<template>
  <div class="docker-panel">
    <div class="docker-header">
      <div>
        <h3>Docker 管理</h3>
        <p>{{ subtitle }}</p>
      </div>
      <div class="header-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadOverview">刷新</el-button>
        <el-button :icon="Close" link @click="$emit('close')" />
      </div>
    </div>

    <div v-loading="loading || installing || cleaning" class="docker-content">
      <el-alert
        v-if="errorMessage"
        type="error"
        :title="errorMessage"
        show-icon
        :closable="false"
      />

      <template v-if="overview">
        <div class="env-grid">
          <div class="env-item">
            <span class="label">Docker</span>
            <el-tag :type="overview.environment.installed ? 'success' : 'danger'">
              {{ overview.environment.installed ? '已安装' : '未安装' }}
            </el-tag>
          </div>
          <div class="env-item">
            <span class="label">Compose</span>
            <el-tag :type="overview.environment.composeInstalled ? 'success' : 'warning'">
              {{ overview.environment.composeInstalled ? '已安装' : '未检测到' }}
            </el-tag>
          </div>
          <div class="env-item">
            <span class="label">服务</span>
            <span class="value">{{ overview.environment.serviceStatus || 'unknown' }}</span>
          </div>
          <div class="env-item">
            <span class="label">系统</span>
            <span class="value">{{ osLabel }}</span>
          </div>
        </div>

        <div v-if="overview.environment.dockerVersion" class="version-line">
          {{ overview.environment.dockerVersion }}
          <span v-if="overview.environment.composeVersion"> / {{ overview.environment.composeVersion }}</span>
        </div>

        <el-alert
          v-if="overview.environment.installed && !overview.environment.socketAccessible"
          type="warning"
          title="已检测到 Docker，但当前用户无法访问 Docker Socket。请使用 root、配置 docker 用户组，或允许免密 sudo docker。"
          show-icon
          :closable="false"
        />

        <div v-if="!overview.environment.installed" class="install-box">
          <div>
            <h4>当前服务器未检测到 Docker</h4>
            <p>可尝试使用当前系统包管理器安装 Docker 与 Docker Compose 插件。</p>
          </div>
          <el-button type="primary" :icon="Download" :loading="installing" @click="installDocker">
            一键安装
          </el-button>
        </div>

        <template v-else>
          <div class="container-toolbar">
            <div class="container-count">
              容器 {{ overview.containers.length }}
            </div>
            <div class="container-toolbar-actions">
              <el-button
                size="small"
                type="warning"
                plain
                :icon="Delete"
                :loading="cleaning"
                @click="cleanupUnused"
              >
                清理未使用
              </el-button>
              <el-input
                v-model="keyword"
                size="small"
                clearable
                placeholder="搜索容器 / 镜像"
              />
            </div>
          </div>

          <el-table
            :data="filteredContainers"
            size="small"
            height="100%"
            class="container-table"
            empty-text="暂无容器"
          >
            <el-table-column label="名称" min-width="150">
              <template #default="{ row }">
                <div class="name-cell">
                  <span class="container-name" :title="row.name">{{ row.name }}</span>
                  <span class="container-id">{{ shortId(row.id) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="镜像" min-width="180">
              <template #default="{ row }">
                <span class="ellipsis" :title="row.image">{{ row.image }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="stateTag(row.state)" size="small">
                  {{ row.state || 'unknown' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="资源" min-width="150">
              <template #default="{ row }">
                <div class="resource-cell">
                  <span>CPU {{ row.cpu || '-' }}</span>
                  <span>{{ row.memory || '-' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="端口" min-width="180">
              <template #default="{ row }">
                <span class="ellipsis" :title="row.ports">{{ row.ports || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="72" fixed="right" align="center">
              <template #default="{ row }">
                <el-dropdown
                  trigger="click"
                  placement="bottom-end"
                  @command="handleContainerCommand($event, row)"
                >
                  <el-button
                    class="docker-action-trigger"
                    size="small"
                    :icon="MoreFilled"
                    circle
                    aria-label="容器操作"
                  />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-if="row.state !== 'running'"
                        command="start"
                        :icon="VideoPlay"
                      >
                        启动
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="row.state === 'running'"
                        command="pause"
                        :icon="VideoPause"
                      >
                        暂停
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="row.state === 'paused'"
                        command="unpause"
                        :icon="VideoPlay"
                      >
                        恢复
                      </el-dropdown-item>
                      <el-dropdown-item command="restart" :icon="Refresh">
                        重启
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="row.state === 'running' || row.state === 'paused'"
                        command="stop"
                        :icon="SwitchButton"
                      >
                        停止
                      </el-dropdown-item>
                      <el-dropdown-item command="remove" :icon="Delete" divided>
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </template>

      <el-empty v-else-if="!loading" description="暂无 Docker 检测信息" />

      <div v-if="lastOutput" class="output-box">
        <div class="output-title">执行输出</div>
        <pre>{{ lastOutput }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { ElCheckbox, ElMessage, ElMessageBox } from 'element-plus'
import {
  Close,
  Delete,
  Download,
  MoreFilled,
  Refresh,
  SwitchButton,
  VideoPause,
  VideoPlay
} from '@element-plus/icons-vue'

type DockerContainerAction = 'start' | 'pause' | 'unpause' | 'restart' | 'stop' | 'remove'

type DockerContainerActionOptions = {
  removeImage?: boolean
  removeNetworks?: boolean
}

interface DockerContainer {
  id: string
  name: string
  image: string
  status: string
  state: string
  ports: string
  createdAt: string
  size: string
  cpu: string
  memory: string
  netIO: string
}

interface DockerOverview {
  environment: {
    installed: boolean
    dockerVersion: string
    composeInstalled: boolean
    composeVersion: string
    serviceStatus: string
    socketAccessible: boolean
    needsSudo: boolean
    os: {
      id: string
      versionId: string
      prettyName: string
      packageManager: string
    }
  }
  containers: DockerContainer[]
}

const props = defineProps<{
  connectionId: string
}>()

defineEmits<{
  close: []
}>()

const overview = ref<DockerOverview | null>(null)
const loading = ref(false)
const installing = ref(false)
const cleaning = ref(false)
const actionLoading = ref(false)
const keyword = ref('')
const errorMessage = ref('')
const lastOutput = ref('')

const subtitle = computed(() => {
  if (!overview.value) return '检测 Docker 环境与容器状态'
  if (!overview.value.environment.installed) return '未安装 Docker'
  return overview.value.environment.socketAccessible ? 'Docker 可用' : 'Docker 权限受限'
})

const osLabel = computed(() => {
  const os = overview.value?.environment.os
  if (!os) return '-'
  return os.prettyName || [os.id, os.versionId].filter(Boolean).join(' ') || os.packageManager
})

const filteredContainers = computed(() => {
  const list = overview.value?.containers || []
  const query = keyword.value.trim().toLowerCase()
  if (!query) return list
  return list.filter((container) =>
    [container.name, container.image, container.status, container.id]
      .some(value => value.toLowerCase().includes(query))
  )
})

onMounted(() => {
  loadOverview()
})

const loadOverview = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await window.electronAPI.docker.getOverview(props.connectionId)
    if (result.success && result.data) {
      overview.value = result.data
    } else {
      errorMessage.value = result.error || 'Docker 检测失败'
    }
  } catch (error: any) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const installDocker = async () => {
  await ElMessageBox.confirm(
    '将在当前 SSH 服务器上安装 Docker 和 Docker Compose 插件。安装需要 root 或 sudo 权限，确认继续吗？',
    '安装 Docker',
    { type: 'warning' }
  )

  installing.value = true
  lastOutput.value = ''
  try {
    const result = await window.electronAPI.docker.install(props.connectionId)
    if (result.success) {
      lastOutput.value = result.data || ''
      ElMessage.success('Docker 安装命令已完成')
      await loadOverview()
    } else {
      lastOutput.value = result.error || ''
      ElMessage.error(`Docker 安装失败: ${result.error || '未知错误'}`)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`Docker 安装失败: ${error.message}`)
    }
  } finally {
    installing.value = false
  }
}

const cleanupUnused = async () => {
  await ElMessageBox.confirm(
    '将清理当前服务器上未使用的 Docker 镜像、卷和构建缓存。正在使用的容器资源不会被删除，确认继续吗？',
    '清理未使用资源',
    {
      type: 'warning',
      confirmButtonText: '开始清理',
      cancelButtonText: '取消'
    }
  )

  cleaning.value = true
  lastOutput.value = ''
  try {
    const result = await window.electronAPI.docker.cleanupUnused(props.connectionId)
    if (result.success) {
      lastOutput.value = result.data || ''
      ElMessage.success('清理完成')
      await loadOverview()
    } else {
      lastOutput.value = result.error || ''
      ElMessage.error(`清理失败: ${result.error || '未知错误'}`)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`清理失败: ${error.message}`)
    }
  } finally {
    cleaning.value = false
  }
}

const confirmRemoveContainer = async (
  container: DockerContainer
): Promise<DockerContainerActionOptions> => {
  const removeOptions = reactive<DockerContainerActionOptions>({
    removeImage: false,
    removeNetworks: false
  })

  const message = h({
    name: 'DockerRemoveOptionsMessage',
    setup() {
      return () =>
        h('div', { style: 'display:flex;flex-direction:column;gap:10px;line-height:1.5;' }, [
          h('div', [
            `确认删除容器 "${container.name}" 吗？`,
            h(
              'div',
              { style: 'margin-top:4px;color:var(--text-tertiary);font-size:12px;' },
              `镜像：${container.image || '-'}`
            )
          ]),
          h(
            ElCheckbox,
            {
              modelValue: removeOptions.removeImage,
              'onUpdate:modelValue': (value: boolean | string | number) => {
                removeOptions.removeImage = Boolean(value)
              }
            },
            () => '同时删除镜像文件'
          ),
          h(
            ElCheckbox,
            {
              modelValue: removeOptions.removeNetworks,
              'onUpdate:modelValue': (value: boolean | string | number) => {
                removeOptions.removeNetworks = Boolean(value)
              }
            },
            () => '同时删除关联网络（默认 bridge / host / none 会跳过）'
          )
        ])
    }
  })

  await ElMessageBox({
    title: '删除容器',
    message,
    type: 'warning',
    showCancelButton: true,
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    confirmButtonClass: 'el-button--danger'
  })

  return {
    removeImage: Boolean(removeOptions.removeImage),
    removeNetworks: Boolean(removeOptions.removeNetworks)
  }
}

const runAction = async (action: DockerContainerAction, container: DockerContainer) => {
  const labels: Record<DockerContainerAction, string> = {
    start: '启动',
    pause: '暂停',
    unpause: '恢复',
    restart: '重启',
    stop: '停止',
    remove: '删除'
  }

  const actionOptions = action === 'remove'
    ? await confirmRemoveContainer(container)
    : undefined

  if (action === 'stop' || action === 'restart') {
    await ElMessageBox.confirm(
      `确认${labels[action]}容器 "${container.name}" 吗？`,
      `${labels[action]}容器`,
      { type: 'info' }
    )
  }

  actionLoading.value = true
  lastOutput.value = ''
  try {
    const result = await window.electronAPI.docker.containerAction(
      props.connectionId,
      action,
      container.id,
      actionOptions
    )

    if (result.success) {
      lastOutput.value = result.data || ''
      ElMessage.success(`${labels[action]}成功`)
      await loadOverview()
    } else {
      lastOutput.value = result.error || ''
      ElMessage.error(`${labels[action]}失败: ${result.error || '未知错误'}`)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`${labels[action]}失败: ${error.message}`)
    }
  } finally {
    actionLoading.value = false
  }
}

const isDockerContainerAction = (command: unknown): command is DockerContainerAction => {
  return (
    typeof command === 'string' &&
    ['start', 'pause', 'unpause', 'restart', 'stop', 'remove'].includes(command)
  )
}

const handleContainerCommand = (command: unknown, container: DockerContainer) => {
  if (isDockerContainerAction(command)) {
    void runAction(command, container)
  }
}

const shortId = (id: string) => id.slice(0, 12)

const stateTag = (state: string) => {
  const normalized = state.toLowerCase()
  if (normalized === 'running') return 'success'
  if (normalized === 'paused') return 'warning'
  if (normalized === 'exited') return 'info'
  return 'danger'
}
</script>

<style scoped>
.docker-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--bg-main);
  color: var(--text-primary);
}

.docker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.docker-header h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
}

.docker-header p {
  margin: 4px 0 0;
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.docker-content {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
}

.env-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.env-item {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
}

.label {
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

.value,
.version-line {
  min-width: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.install-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
}

.install-box h4 {
  margin: 0 0 6px;
  font-size: var(--text-base);
}

.install-box p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.container-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.container-toolbar-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.container-toolbar-actions .el-input {
  width: 220px;
}

.container-count {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 600;
}

.container-table {
  flex: 1;
  min-height: 0;
}

.name-cell,
.resource-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.container-name,
.ellipsis {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.container-id,
.resource-cell {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 11px;
}

.docker-action-trigger {
  width: 28px;
  height: 28px;
  min-width: 28px;
  padding: 0;
}

.output-box {
  flex-shrink: 0;
}

.output-title {
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 700;
}

.output-box pre {
  max-height: 120px;
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
}

:deep(.el-table) {
  background: transparent;
}

:deep(.el-table th.el-table__cell) {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

:deep(.el-table tr),
:deep(.el-table td.el-table__cell) {
  background: transparent;
}

.container-table :deep(.el-table__cell.el-table-fixed-column--right),
.container-table :deep(.el-table__cell.is-fixed-right),
.container-table :deep(.el-table__fixed-right .el-table__cell) {
  background: var(--bg-main) !important;
  z-index: 3;
}

.container-table :deep(th.el-table__cell.el-table-fixed-column--right),
.container-table :deep(th.el-table__cell.is-fixed-right),
.container-table :deep(.el-table__fixed-right th.el-table__cell) {
  background: var(--bg-tertiary) !important;
}

.container-table :deep(td.el-table__cell.el-table-fixed-column--right),
.container-table :deep(td.el-table__cell.is-fixed-right),
.container-table :deep(.el-table__fixed-right td.el-table__cell) {
  box-shadow: -8px 0 12px rgba(15, 23, 42, 0.06);
}

:global(:root.app-appearance-terminal .docker-panel),
:global(:root.app-appearance-minimal .docker-panel) {
  background: var(--bg-main);
}

:global(:root.app-appearance-terminal .docker-header),
:global(:root.app-appearance-minimal .docker-header) {
  padding: 9px 12px;
}

:global(:root.app-appearance-terminal .docker-header h3),
:global(:root.app-appearance-minimal .docker-header h3) {
  font-family: var(--font-mono);
}
</style>
