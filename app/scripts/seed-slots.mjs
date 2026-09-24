/**
 * Generates bookable slots for the next 30 days.
 *
 * Safe to re-run: the unique (date, time) index means existing slots are
 * skipped rather than duplicated, and nothing already booked is touched.
 *
 * Run with:  npm run seed:slots
 */
import { readFileSync } from "node:fs";
import mongoose from "mongoose";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const SLOT_MINUTES = 12;
const SESSIONS = {
  MORNING: { start: "10:00", end: "13:00" },
  EVENING: { start: "17:00", end: "20:00" },
};
const OPD_WEEKDAYS = [1, 2, 3, 4, 5, 6]; // Mon–Sat

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });

const Slot = mongoose.model("Slot", new mongoose.Schema({
  date: String, time: String, session: String,
  status: { type: String, default: "AVAILABLE" },
  lockExpiresAt: { type: Date, default: null },
  bookingId: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true }));

await Slot.collection.createIndex({ date: 1, time: 1 }, { unique: true });

const toMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const docs = [];
const today = new Date();

for (let offset = 0; offset < 30; offset++) {
  const day = new Date(today);
  day.setDate(today.getDate() + offset);
  if (!OPD_WEEKDAYS.includes(day.getDay())) continue;

  const date = day.toISOString().slice(0, 10);
  for (const [session, { start, end }] of Object.entries(SESSIONS)) {
    for (let m = toMinutes(start); m < toMinutes(end); m += SLOT_MINUTES) {
      docs.push({ date, time: toHHMM(m), session, status: "AVAILABLE" });
    }
  }
}

let created = 0;
try {
  const res = await Slot.insertMany(docs, { ordered: false });
  created = res.length;
} catch (e) {
  created = e.insertedDocs?.length ?? 0;
  if (e.code !== 11000) throw e;
}

const total = await Slot.countDocuments();
const days = (await Slot.distinct("date")).length;
console.log(`Created ${created} new slots (${docs.length - created} already existed).`);
console.log(`Database now holds ${total} slots across ${days} working days.`);

await mongoose.disconnect();
