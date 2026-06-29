declare module '@/lib/novnc/rfb.js' {
  interface RFBCredentials {
    password?: string
  }

  interface RFBOptions {
    credentials?: RFBCredentials
    shared?: boolean
    wsProtocols?: string[]
  }

  interface RFBEventMap {
    connect: Event
    disconnect: CustomEvent<{ clean: boolean }>
    credentialsrequired: Event
    securityfailure: CustomEvent<{ reason?: string }>
  }

  export default class RFB extends EventTarget {
    constructor(target: HTMLElement, url: string, options?: RFBOptions)

    viewOnly: boolean
    scaleViewport: boolean
    resizeSession: boolean
    showDotCursor: boolean
    qualityLevel: number
    compressionLevel: number

    sendCredentials(credentials: RFBCredentials): void
    sendCtrlAltDel(): void
    clipboardPasteFrom(text: string): void
    disconnect(): void

    addEventListener<K extends keyof RFBEventMap>(
      type: K,
      listener: (event: RFBEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions
    ): void
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void
  }
}
