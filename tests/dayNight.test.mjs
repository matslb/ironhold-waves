import test from "node:test";
import assert from "node:assert/strict";
import { createDayNightClock, describeDayPhase, normalizeDayPhase } from "../src/systems/dayNight.js";

test("the valley clock keeps a twelve-minute pace at different frame rates", () => {
  const fast = createDayNightClock();
  const slow = createDayNightClock();
  for (let i = 0; i < 3600; i += 1) fast.advance(1 / 60);
  for (let i = 0; i < 900; i += 1) slow.advance(1 / 15);
  assert.ok(Math.abs(fast.phase - slow.phase) < 1e-10);
  assert.ok(Math.abs(fast.phase - (0.35 + 60 / 720)) < 1e-10);
});

test("the clock wraps at dawn and resets to its configured starting phase", () => {
  const clock = createDayNightClock({ cycleSeconds: 720, startPhase: 0.99 });
  clock.advance(14.4);
  assert.ok(Math.abs(clock.phase - 0.01) < 1e-10);
  clock.reset();
  assert.equal(clock.phase, 0.99);
  assert.equal(normalizeDayPhase(-0.25), 0.75);
  assert.equal(normalizeDayPhase(2.25), 0.25);
});

test("late joiners accept the host phase and ignore malformed snapshots", () => {
  const host = createDayNightClock();
  const joiner = createDayNightClock();
  host.advance(300);
  assert.equal(joiner.sync(host.phase), true);
  assert.equal(joiner.phase, host.phase);
  for (const value of [undefined, null, "0.8", NaN, Infinity]) {
    assert.equal(joiner.sync(value), false);
    assert.equal(joiner.phase, host.phase);
  }
});

test("pauses and invalid deltas cannot advance or corrupt the clock", () => {
  const clock = createDayNightClock();
  for (const delta of [0, -1, NaN, Infinity, "30", undefined]) clock.advance(delta);
  assert.equal(clock.phase, 0.35);
});

test("phase labels agree with dawn, daylight, dusk and night", () => {
  for (const [phase, key] of [[0.05, "dawn"], [0.35, "day"], [0.53, "dusk"], [0.75, "night"], [0.99, "dawn"]]) {
    assert.equal(describeDayPhase(phase).key, key);
  }
});
