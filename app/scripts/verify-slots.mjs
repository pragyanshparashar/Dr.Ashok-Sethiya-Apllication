/**
 * End-to-end check against the dev database:
 *   1. generates a day's slots
 *   2. fires 20 simultaneous claims at ONE slot
 *   3. asserts exactly one wins
 *
 * This is the guarantee the whole booking system rests on, so it is worth
 * proving against a real cluster rather than a mock.
 *
 * Run with:  npm run verify:slots
 */
import { readFileSync } from "node:fs";
import mongoose from "mongoose";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });

const slotSchema = new mongoose.Schema({
  date: String, time: String, session: String,
  status: { type: String, default: "AVAILABLE" },
  lockExpiresAt: { type: Date, default: null },
  bookingId: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true });
slotSchema.index({ date: 1, time: 1 }, { unique: true });
const Slot = mongoose.model("Slot", slotSchema);

const TEST_DATE = "2099-01-01"; // far future so it can never collide with real data
await Slot.deleteMany({ date: TEST_DATE });

// --- 1. Generate a session's worth of slots -------------------------------
const times = [];
for (let m = 17 * 60; m < 20 * 60; m += 12) {
  times.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
}
await Slot.insertMany(times.map((time) => ({ date: TEST_DATE, time, session: "EVENING" })));
console.log(`Generated ${times.length} evening slots (${times[0]} – ${times.at(-1)})`);
console.log(`Expected 15 for a 3-hour session at 12-min slots: ${times.length === 15 ? "PASS" : "FAIL"}`);

// --- 2. Twenty patients race for the same slot ----------------------------
const contested = times[5];
const results = await Promise.all(
  Array.from({ length: 20 }, (_, i) =>
    Slot.findOneAndUpdate(
      { date: TEST_DATE, time: contested, status: "AVAILABLE" },
      { $set: { status: "HELD", bookingId: new mongoose.Types.ObjectId(), lockExpiresAt: new Date(Date.now() + 600000) } },
      { returnDocument: 'after' },
    ).then((doc) => (doc ? `winner-${i}` : null)),
  ),
);

const winners = results.filter(Boolean);
console.log(`\n20 simultaneous claims on ${contested}:`);
console.log(`  winners: ${winners.length}  losers: ${results.length - winners.length}`);
console.log(`  exactly one winner: ${winners.length === 1 ? "PASS" : "FAIL"}`);

// --- 3. The unique index must reject a duplicate slot ---------------------
let indexHeld = false;
try {
  await Slot.create({ date: TEST_DATE, time: contested, session: "EVENING" });
} catch (e) {
  indexHeld = e.code === 11000;
}
console.log(`\nDuplicate slot rejected by unique index: ${indexHeld ? "PASS" : "FAIL"}`);

await Slot.deleteMany({ date: TEST_DATE });
await mongoose.disconnect();
console.log("\nCleaned up test data.");
