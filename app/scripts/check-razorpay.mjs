/**
 * Verifies the Razorpay credentials in .env.local by creating a real test
 * order (fake money, test mode only) and reading it back.
 *
 * Run with:  npm run check:razorpay
 */
import { readFileSync } from "node:fs";
import Razorpay from "razorpay";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not filled in .env.local yet.");
  process.exit(1);
}

if (!keyId.startsWith("rzp_test_")) {
  console.error(
    `Key ID starts with "${keyId.slice(0, 9)}" — that is not a test key.\n` +
      "Live keys move real money. Switch the Razorpay dashboard to Test Mode\n" +
      "and generate a key that begins rzp_test_.",
  );
  process.exit(1);
}

try {
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const order = await razorpay.orders.create({
    amount: 50000,
    currency: "INR",
    receipt: "connectivity-check",
    notes: { purpose: "Verifying credentials only" },
  });

  console.log("Razorpay credentials are working.");
  console.log(`  mode:     TEST (no real money can move)`);
  console.log(`  order:    ${order.id}`);
  console.log(`  amount:   ₹${order.amount / 100}`);
  console.log(`  status:   ${order.status}`);
  console.log("\nTest cards for the demo:");
  console.log("  4111 1111 1111 1111   succeeds");
  console.log("  4000 0000 0000 0002   fails");
  console.log("  CVV: any 3 digits · Expiry: any future date · Bank OTP: 1111");
  console.log("  UPI: success@razorpay  or  failure@razorpay");
} catch (error) {
  console.error("Could not authenticate with Razorpay.");
  console.error(`  ${error.error?.description ?? error.message}`);
  console.error("\nMost likely the Key ID and Key Secret do not match, or one was");
  console.error("copied with a stray space. Re-copy both from Settings > API Keys.");
  process.exit(1);
}
