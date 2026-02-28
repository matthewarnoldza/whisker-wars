/**
 * Register a Yoco webhook endpoint.
 *
 * Usage:
 *   node scripts/register-yoco-webhook.mjs <webhook_url>
 *
 * Example:
 *   node scripts/register-yoco-webhook.mjs https://your-app.vercel.app/api/webhook
 *
 * IMPORTANT: Save the "secret" from the response — it's only shown once.
 * Put it in your .env as YOCO_WEBHOOK_SECRET.
 */

const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY || 'sk_test_08788fa0OgzQYD1a51a427a88cdc'
const webhookUrl = process.argv[2]

if (!webhookUrl) {
  console.error('Usage: node scripts/register-yoco-webhook.mjs <webhook_url>')
  console.error('Example: node scripts/register-yoco-webhook.mjs https://your-app.vercel.app/api/webhook')
  process.exit(1)
}

async function registerWebhook() {
  console.log(`Registering webhook: ${webhookUrl}`)
  console.log(`Using key: ${YOCO_SECRET_KEY.slice(0, 12)}...`)
  console.log()

  const response = await fetch('https://payments.yoco.com/api/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${YOCO_SECRET_KEY}`,
    },
    body: JSON.stringify({
      name: 'WhiskerWars Payment Webhook',
      url: webhookUrl,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Failed to register webhook:', response.status)
    console.error(JSON.stringify(data, null, 2))
    process.exit(1)
  }

  console.log('Webhook registered successfully!')
  console.log()
  console.log(JSON.stringify(data, null, 2))
  console.log()
  console.log('='.repeat(60))
  console.log('SAVE THIS SECRET — it is only shown once:')
  console.log(data.secret || '(not found in response — check full output above)')
  console.log('='.repeat(60))
  console.log()
  console.log('Add it to your .env:')
  console.log(`YOCO_WEBHOOK_SECRET=${data.secret || 'whsec_...'}`)
}

registerWebhook().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
