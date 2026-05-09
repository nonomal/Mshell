import { beforeEach, describe, expect, it } from 'vitest'
import { SecurityStore } from './security-store'

describe('SecurityStore', () => {
  let store: SecurityStore

  beforeEach(() => {
    localStorage.clear()
    store = new SecurityStore()
  })

  it('stores only a salted PIN hash and verifies the PIN', async () => {
    await store.setPin('123456')
    const raw = localStorage.getItem('mshell-mobile-security-v1') || ''

    expect(raw).not.toContain('123456')
    await expect(store.verifyPin('123456')).resolves.toBe(true)
    await expect(store.verifyPin('000000')).resolves.toBe(false)
    expect(store.isLockRequired()).toBe(true)
  })

  it('disables lock when all authentication methods are removed', async () => {
    await store.setPin('1234')
    store.update({ pinEnabled: false, biometricEnabled: false })

    expect(store.getSettings()).toMatchObject({
      enabled: false,
      pinEnabled: false,
      biometricEnabled: false
    })
    expect(store.isLockRequired()).toBe(false)
  })

  it('enables preferred biometric unlock by default when biometric auth is enabled', () => {
    store.update({ enabled: true, biometricEnabled: true })

    expect(store.getSettings()).toMatchObject({
      enabled: true,
      biometricEnabled: true,
      preferBiometric: true
    })
    expect(store.isLockRequired()).toBe(true)
  })
})
