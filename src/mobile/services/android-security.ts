import { registerPlugin } from '@capacitor/core'

export interface BiometricAvailability {
  available: boolean
  error?: string
}

export interface BiometricAuthResult {
  success: boolean
  error?: string
}

interface MshellSecurityPlugin {
  isBiometricAvailable(): Promise<BiometricAvailability>
  authenticate(options: { title: string; subtitle?: string }): Promise<BiometricAuthResult>
}

const MshellSecurity = registerPlugin<MshellSecurityPlugin>('MshellSecurity')

export const isBiometricAvailable = async (): Promise<BiometricAvailability> => {
  try {
    return await MshellSecurity.isBiometricAvailable()
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : '当前环境不支持系统生物识别'
    }
  }
}

export const authenticateWithBiometric = async (): Promise<BiometricAuthResult> => {
  try {
    return await MshellSecurity.authenticate({
      title: '解锁 MShell',
      subtitle: '使用系统指纹或设备凭据验证身份'
    })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '系统生物识别验证失败'
    }
  }
}
