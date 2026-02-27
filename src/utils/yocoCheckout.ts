interface CreateCheckoutResult {
  success: boolean
  checkoutId?: string
  redirectUrl?: string
  error?: string
}

export async function createYocoCheckout(
  profileId: string,
  cloudCode?: string
): Promise<CreateCheckoutResult> {
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, cloudCode }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return { success: false, error: data.error || 'Payment service unavailable' }
    }

    const data = await response.json()
    return {
      success: true,
      checkoutId: data.checkoutId,
      redirectUrl: data.redirectUrl,
    }
  } catch {
    return { success: false, error: 'Could not connect to payment service' }
  }
}

export function getPaymentReturnStatus(): {
  status: string | null
  checkoutId: string | null
} {
  const params = new URLSearchParams(window.location.search)
  return {
    status: params.get('payment'),
    checkoutId: params.get('checkoutId'),
  }
}

export function clearPaymentParams(): void {
  window.history.replaceState(
    {},
    '',
    window.location.pathname + window.location.hash
  )
}
