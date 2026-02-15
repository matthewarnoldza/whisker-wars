let sdkLoaded = false
let sdkLoading = false
let loadPromise: Promise<void> | null = null

export function loadPeachSdk(): Promise<void> {
  if (sdkLoaded) return Promise.resolve()

  if (sdkLoading && loadPromise) {
    return loadPromise
  }

  sdkLoading = true
  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://js.peachpayments.com/v2/checkout.js'
    script.async = true
    script.onload = () => {
      sdkLoaded = true
      sdkLoading = false
      resolve()
    }
    script.onerror = () => {
      sdkLoading = false
      loadPromise = null
      reject(new Error('Failed to load Peach SDK'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}

export function isPeachSdkLoaded(): boolean {
  return sdkLoaded
}
