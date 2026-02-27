import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { profileId, cloudCode } = req.body ?? {}
  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' })
  }

  const secretKey = process.env.YOCO_SECRET_KEY
  const appUrl = process.env.APP_URL || 'http://localhost:5173'

  if (!secretKey) {
    console.error('YOCO_SECRET_KEY not configured')
    return res.status(500).json({ error: 'Payment service not configured' })
  }

  try {
    const response = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount: 12000,
        currency: 'ZAR',
        successUrl: `${appUrl}/?payment=success#jungle`,
        cancelUrl: `${appUrl}/?payment=cancelled#jungle`,
        failureUrl: `${appUrl}/?payment=failed#jungle`,
        metadata: {
          profileId,
          cloudCode: cloudCode || '',
          product: 'jungle-pass',
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Yoco API error:', response.status, errorBody)
      return res.status(502).json({ error: 'Payment provider error' })
    }

    const data = await response.json()
    return res.status(200).json({
      checkoutId: data.id,
      redirectUrl: data.redirectUrl,
    })
  } catch (error) {
    console.error('Checkout creation failed:', error)
    return res.status(500).json({ error: 'Failed to create checkout' })
  }
}
