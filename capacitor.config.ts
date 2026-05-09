import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mshell.mobile',
  appName: 'MShell Mobile',
  webDir: 'dist-mobile',
  server: {
    androidScheme: 'https'
  }
}

export default config
