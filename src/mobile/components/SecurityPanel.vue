<template>
  <div class="security-panel">
    <div class="section-head">
      <div>
        <h2>安全锁</h2>
        <p>{{ statusText }}</p>
      </div>
    </div>

    <label class="checkbox-row">
      <input v-model="localSettings.enabled" type="checkbox" @change="saveToggles" />
      启用启动锁
    </label>

    <label class="checkbox-row">
      <input v-model="localSettings.lockOnResume" type="checkbox" @change="saveToggles" />
      应用回到前台时重新锁定
    </label>

    <label class="checkbox-row">
      <input
        v-model="localSettings.biometricEnabled"
        type="checkbox"
        :disabled="!biometricAvailable"
        @change="saveToggles"
      />
      系统指纹/设备凭据
    </label>

    <label class="checkbox-row">
      <input
        v-model="localSettings.preferBiometric"
        type="checkbox"
        :disabled="!localSettings.biometricEnabled || !biometricAvailable"
        @change="saveToggles"
      />
      锁定后优先弹出系统指纹
    </label>

    <form class="pin-form" @submit.prevent="setPin">
      <input
        v-model="pin"
        inputmode="numeric"
        autocomplete="new-password"
        type="password"
        placeholder="设置 4 位以上 PIN"
      />
      <input
        v-model="pinConfirm"
        inputmode="numeric"
        autocomplete="new-password"
        type="password"
        placeholder="再次输入 PIN"
      />
      <button type="submit">保存 PIN</button>
    </form>

    <div class="form-actions compact">
      <button type="button" class="secondary" @click="$emit('lock-now')">立即锁定</button>
      <button type="button" class="danger" @click="disableSecurity">关闭安全锁</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { SecuritySettings } from '../services/security-store'
import { securityStore } from '../services/security-store'
import { isBiometricAvailable } from '../services/android-security'

const props = defineProps<{ settings: SecuritySettings }>()
defineEmits<{ 'lock-now': [] }>()

const localSettings = reactive<SecuritySettings>({ ...props.settings })
const pin = ref('')
const pinConfirm = ref('')
const message = ref('')
const biometricAvailable = ref(false)

const statusText = computed(() => {
  if (!localSettings.enabled) return '未启用'
  const methods = []
  if (localSettings.pinEnabled) methods.push('PIN')
  if (localSettings.biometricEnabled) {
    methods.push(localSettings.preferBiometric ? '优先系统指纹' : '系统指纹')
  }
  return methods.length ? `已启用：${methods.join(' + ')}` : '已启用，但还没有验证方式'
})

watch(
  () => props.settings,
  (settings) => {
    Object.assign(localSettings, settings)
  },
  { deep: true }
)

onMounted(async () => {
  const availability = await isBiometricAvailable()
  biometricAvailable.value = availability.available
  if (!availability.available && localSettings.biometricEnabled) {
    localSettings.biometricEnabled = false
    saveToggles()
  }
})

const saveToggles = () => {
  const biometricEnabled = localSettings.biometricEnabled && biometricAvailable.value
  securityStore.update({
    enabled: localSettings.enabled,
    biometricEnabled,
    preferBiometric: biometricEnabled && localSettings.preferBiometric,
    lockOnResume: localSettings.lockOnResume,
    lockOnStart: true
  })
  message.value = localSettings.biometricEnabled && !biometricAvailable.value
    ? '当前设备没有可用的系统指纹'
    : '安全设置已保存'
}

const setPin = async () => {
  try {
    if (pin.value !== pinConfirm.value) {
      message.value = '两次输入的 PIN 不一致'
      return
    }
    await securityStore.setPin(pin.value)
    pin.value = ''
    pinConfirm.value = ''
    message.value = 'PIN 已保存'
  } catch (error: any) {
    message.value = error.message || '保存 PIN 失败'
  }
}

const disableSecurity = () => {
  if (!window.confirm('关闭安全锁后，打开应用将不再验证身份。确定关闭？')) return
  securityStore.disableAll()
  message.value = '安全锁已关闭'
}
</script>
