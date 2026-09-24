import Razorpay from "razorpay";

/**
 * Single Razorpay client, constructed lazily.
 *
 * Constructing it eagerly at module load would crash any script or test that
 * imports this file without the env vars set (e.g. slot-generation tests that
 * never touch payments). Building it on first use keeps those concerns separate.
 */
let client: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (client) return client;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set.");
  }

  client = new Razorpay({ key_id, key_secret });
  return client;
}
