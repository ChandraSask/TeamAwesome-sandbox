import assert from "node:assert/strict";
import test from "node:test";
import { monthEndCountdown } from "./pfeUtils.js";

const cases = [
  { label: "10 days does not activate reminder", date: [2026, 9, 21], days: 10, tone: "on-track" },
  { label: "9 days activates reminder", date: [2026, 9, 22], days: 9, tone: "upcoming" },
  { label: "last day is urgent", date: [2026, 9, 31], days: 0, tone: "urgent" },
  { label: "new month resets countdown", date: [2026, 10, 1], days: 29, tone: "on-track" },
  { label: "February has 28 days", date: [2027, 1, 19], days: 9, tone: "upcoming" },
  { label: "leap February has 29 days", date: [2028, 1, 19], days: 10, tone: "on-track" },
  { label: "year end", date: [2026, 11, 31], days: 0, tone: "urgent" },
  { label: "daylight saving month uses calendar days", date: [2026, 2, 1], days: 30, tone: "on-track" },
];

for (const { label, date, days, tone } of cases) {
  test(label, () => {
    for (const hour of [0, 12, 23]) {
      const today = new Date(...date, hour, 59);
      const countdown = monthEndCountdown(today);
      assert.equal(countdown.daysRemaining, days);
      assert.equal(countdown.reminderDue, days < 10);
      assert.equal(countdown.tone, tone);
      const monthEnd = new Date(countdown.monthEnd);
      assert.equal(monthEnd.getFullYear(), date[0]);
      assert.equal(monthEnd.getMonth(), date[1]);
      assert.equal(monthEnd.getDate(), date[2] + days);
    }
  });
}
