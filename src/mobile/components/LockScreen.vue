<template>
  <div class="lock-screen">
    <div class="lock-panel">
      <p class="eyebrow">MShell Security</p>
      <h2>已锁定</h2>
      <p>验证身份后才能查看会话、私钥和同步数据。</p>

      <button
        v-if="settings.biometricEnabled && biometricAvailable"
        type="button"
        :disabled="biometricPromptActive"
        @click="unlockWithBiometric"
      >
        {{ biometricPromptActive ? '正在验证...' : '使用系统指纹' }}
      </button>

      <form v-if="settings.pinEnabled" class="pin-form" @submit.prevent="unlockWithPin">
        <input
          v-model="pin"
          inputmode="numeric"
          autocomplete="current-password"
          type="password"
          placeholder="输入 PIN"
        />
        <button type="submit">解锁</button>
      </form>

      <p v-if="message" class="message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { SecuritySettings } from '../services/security-store'
import { authenticateWithBiometric, isBiometricAvailable } from '../services/android-security'
import { securityStore } from '../services/security-store'

const props = defineProps<{ settings: SecuritySettings }>()
const emit = defineEmits<{ unlocked: [] }>()

const pin = ref('')
const message = ref('')
const biometricAvailable = ref(false)
const biometricPromptActive = ref(false)
const biometricAttempted = ref(false)

onMounted(async () => {
  const availability = await isBiometricAvailable()
  biometricAvailable.value = availability.available
  requestPreferredBiometric()
})

const unlockWithBiometric = async () => {
  if (biometricPromptActive.value) {
    return
  }

  message.value = ''
  biometricPromptActive.value = true
  biometricAttempted.value = true
  const result = await authenticateWithBiometric()
  biometricPromptActive.value = false
  if (result.success) {
    emit('unlocked')
    return
  }
  message.value = result.error || '指纹验证失败'
}

const unlockWithPin = async () => {
  if (await securityStore.verifyPin(pin.value)) {
    pin.value = ''
    emit('unlocked')
    return
  }
  message.value = 'PIN 不正确'
}

const requestPreferredBiometric = () => {
  if (
    props.settings.biometricEnabled &&
    props.settings.preferBiometric &&
    biometricAvailable.value &&
    !biometricAttempted.value
  ) {
    unlockWithBiometric()
  }
}

watch(
  () => props.settings,
  () => {
    requestPreferredBiometric()
  },
  { deep: true }
)
</script>
