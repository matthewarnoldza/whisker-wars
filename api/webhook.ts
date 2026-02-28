import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get } from 'firebase/database'

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
}

let firebaseApp: ReturnType<typeof initializeApp> | null = null

function getFirebase() {
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig, 'webhook')
  }
  return getDatabase(firebaseApp)
}

function verifySignature(
  body: string,
  webhookId: string,
  timestamp: string,
  signature: string,
  secret: string
): boolean {
  // Reject webhooks older than 5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false

  // Strip 'whsec_' prefix and base64-decode the secret
  const signingKey = Buffer.from(secret.replace('whsec_', ''), 'base64')
  const signedContent = `${webhookId}.${timestamp}.${body}`
  const expectedSig = crypto
    .createHmac('sha256', signingKey)
    .update(signedContent)
    .digest('base64')

  // Signature header may contain multiple space-separated signatures
  const signatures = signature.split(' ')
  return signatures.some((sig) => {
    const parts = sig.split(',')
    const sigValue = parts[1]
    if (!sigValue) return false
    try {
      return crypto.timingSafeEqual(
        Buffer.from(sigValue),
        Buffer.from(expectedSig)
      )
    } catch {
      return false
    }
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const webhookSecret = process.env.YOCO_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('YOCO_WEBHOOK_SECRET not configured')
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  const webhookId = req.headers['webhook-id'] as string
  const timestamp = req.headers['webhook-timestamp'] as string
  const signature = req.headers['webhook-signature'] as string

  if (!webhookId || !timestamp || !signature) {
    return res.status(401).json({ error: 'Missing webhook headers' })
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)

  if (!verifySignature(rawBody, webhookId, timestamp, signature, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

  if (event.type !== 'payment.succeeded') {
    return res.status(200).json({ received: true })
  }

  const payload = event.payload || event.data || event
  const metadata = payload?.metadata
  const profileId = metadata?.profileId
  const product = metadata?.product
  const checkoutId = payload?.checkoutId || payload?.id || event.id

  if (!profileId || product !== 'jungle-pass') {
    return res.status(200).json({ received: true, ignored: true })
  }

  try {
    const database = getFirebase()

    // Idempotency: skip if already recorded
    const existingRef = ref(database, `payments/${profileId}/${checkoutId}`)
    const existing = await get(existingRef)
    if (existing.exists()) {
      return res.status(200).json({ received: true, duplicate: true })
    }

    // Write payment record
    await set(existingRef, {
      status: 'succeeded',
      product: 'jungle-pass',
      amount: payload?.amount || 6500,
      currency: payload?.currency || 'ZAR',
      timestamp: Date.now(),
      yocoPaymentId: payload?.paymentId || '',
    })

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook processing failed:', error)
    return res.status(500).json({ error: 'Failed to process webhook' })
  }
}
