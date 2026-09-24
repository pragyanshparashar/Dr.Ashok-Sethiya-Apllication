import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify that a payload genuinely came from Razorpay.
 *
 * Without this, anyone who learns a booking ID could POST a fake "payment
 * succeeded" to our webhook and receive a free consultation. The signature is
 * an HMAC computed with a secret only Razorpay and this server know.
 *
 * Comparison is constant-time: a plain === leaks information through how long
 * it takes to fail, which is enough to forge a signature given patience.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Verifies the webhook body against the X-Razorpay-Signature header. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    // Refusing is the only safe default. Accepting unverified webhooks would
    // mean anyone could mark any booking as paid.
    console.error("RAZORPAY_WEBHOOK_SECRET is not set — rejecting webhook.");
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(expected, signature);
}

/**
 * Verifies the signature Razorpay hands back to the browser after checkout.
 *
 * This one is signed with the API secret over "order_id|payment_id". It is why
 * the browser's claim of success can be trusted enough to show a confirmation
 * screen — though the webhook remains the source of truth for the booking.
 */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeCompare(expected, signature);
}
