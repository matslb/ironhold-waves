import test from "node:test";
import assert from "node:assert/strict";
import { createHandheldInput, detectHandheldInput, stickAxes } from "../src/systems/handheldInput.js";

class Surface {
  constructor(action) {
    this.listeners = new Map(); this.style = {}; this.dataset = { touchAction: action };
    this.classes = new Set(); this.captured = new Set(); this.disabled = false;
    this.classList = { add: x => this.classes.add(x), remove: x => this.classes.delete(x) };
  }
  addEventListener(type, callback) { const list = this.listeners.get(type) || []; list.push(callback); this.listeners.set(type, list); }
  fire(type, id = 1, x = 64, y = 64, more = {}) {
    const event = { pointerId: id, pointerType: "touch", clientX: x, clientY: y, button: 0,
      preventDefault() { this.prevented = true; }, stopPropagation() {}, ...more };
    for (const callback of this.listeners.get(type) || []) callback(event);
    return event;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 128, height: 128 }; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
}
function fixture(enabled = true) {
  const window = new Surface(), stick = new Surface(), thumb = new Surface(), look = new Surface();
  const attack = new Surface("attack"), guard = new Surface("secondary"), utility = new Surface("utility");
  const actions = [], looks = []; let allowed = true, releases = 0, enables = 0;
  const input = createHandheldInput({ window, stick, thumb, lookSurface: look, buttons: [attack, guard, utility], enabled,
    canPlay: () => allowed, onEnable: () => enables++, onLook: (x, y) => looks.push([x, y]),
    onAction: action => actions.push(action), onSecondaryRelease: () => releases++ });
  return { window, stick, thumb, look, attack, guard, utility, actions, looks, input,
    allow: value => { allowed = value; }, releases: () => releases, enables: () => enables };
}

test("touch detection includes landscape phones/tablets without changing mouse-only desktops", () => {
  assert.equal(detectHandheldInput({ matchMedia: () => ({ matches: true }) }, { maxTouchPoints: 0 }), true);
  assert.equal(detectHandheldInput({ matchMedia: () => ({ matches: false }) }, { maxTouchPoints: 5 }), true);
  assert.equal(detectHandheldInput({ matchMedia: () => ({ matches: false }) }, { maxTouchPoints: 0 }), false);
});

test("thumbstick dead zone, gradual movement, and diagonal bounds", () => {
  assert.deepEqual(stickAxes(1, 1, 44), { x: 0, z: 0 });
  const walk = stickAxes(0, -22, 44);
  assert.ok(walk.z < -.4 && walk.z > -.5);
  for (const [x, y] of [[1000, -1000], [-1000, 20], [0, -44]]) {
    const axes = stickAxes(x, y, 44);
    assert.ok(Math.hypot(axes.x, axes.z) <= 1 + 1e-12);
  }
});

test("three fingers can move, aim, and attack without stealing gestures", () => {
  const f = fixture();
  f.stick.fire("pointerdown", 1, 64, 20);
  f.look.fire("pointerdown", 2, 400, 120);
  f.attack.fire("pointerdown", 3);
  f.look.fire("pointermove", 2, 460, 150);
  assert.equal(f.input.state.z, -1);
  assert.deepEqual(f.looks, [[60, 30]]);
  assert.equal(f.input.state.attackHeld, true);
  f.attack.fire("pointerup", 3);
  assert.equal(f.input.state.attackHeld, false);
  assert.equal(f.input.state.z, -1);
  f.stick.fire("pointermove", 2, 0, 0);
  assert.equal(f.input.state.z, -1, "look finger cannot move the stick");
  f.window.fire("pointerup", 1);
  assert.deepEqual([f.input.state.x, f.input.state.z], [0, 0]);
});

test("guard releases on cancellation and ignores other fingers' releases", () => {
  const f = fixture();
  f.guard.fire("pointerdown", 1); f.attack.fire("pointerdown", 2);
  f.window.fire("pointercancel", 99);
  f.attack.fire("pointerup", 2);
  assert.equal(f.input.state.secondaryHeld, true);
  assert.equal(f.releases(), 0);
  f.guard.fire("pointercancel", 1);
  assert.equal(f.input.state.secondaryHeld, false);
  assert.equal(f.releases(), 1);
  f.guard.fire("pointerup", 1);
  assert.equal(f.releases(), 1, "duplicate release cannot clear another input");
});

test("two fingers holding one button keep it active until both release", () => {
  const f = fixture();
  f.guard.fire("pointerdown", 1); f.guard.fire("pointerdown", 2);
  f.guard.fire("pointerup", 1);
  assert.equal(f.input.state.secondaryHeld, true);
  assert.equal(f.guard.classes.has("pressed"), true);
  assert.equal(f.releases(), 0);
  f.guard.fire("lostpointercapture", 2);
  assert.equal(f.input.state.secondaryHeld, false);
  assert.equal(f.guard.classes.has("pressed"), false);
  assert.equal(f.releases(), 1);
});

test("pause/dialogue, rotation, and app switching release all movement and held actions", () => {
  for (const reason of ["modal", "resize", "blur"]) {
    const f = fixture();
    f.stick.fire("pointerdown", 1, 120, 64);
    f.guard.fire("pointerdown", 2); f.attack.fire("pointerdown", 3);
    if (reason === "modal") { f.allow(false); f.input.update(); }
    else f.window.fire(reason);
    assert.deepEqual(f.input.state, { x: 0, z: 0, attackHeld: false, secondaryHeld: false });
    assert.equal(f.releases(), 1);
    assert.equal(f.stick.captured.size + f.guard.captured.size + f.attack.captured.size, 0);
  }
});

test("unsupported pointer capture still releases on global pointerup", () => {
  const f = fixture();
  f.attack.setPointerCapture = () => { throw Error("unsupported"); };
  f.attack.fire("pointerdown", 4);
  assert.equal(f.input.state.attackHeld, true);
  f.window.fire("pointerup", 4);
  assert.equal(f.input.state.attackHeld, false);
});

test("touch enables controls once; mouse clicks and blocked/disabled controls do not fire gameplay", () => {
  const f = fixture(false);
  f.attack.fire("pointerdown", 1, 0, 0, { pointerType: "mouse" });
  assert.deepEqual(f.actions, []);
  f.allow(false);
  f.window.fire("pointerdown", 2);
  assert.equal(f.enables(), 1);
  f.attack.fire("pointerdown", 3);
  assert.deepEqual(f.actions, []);
  f.allow(true); f.utility.disabled = true;
  f.utility.fire("pointerdown", 4);
  assert.deepEqual(f.actions, []);
  f.attack.fire("pointerdown", 5); f.attack.fire("pointerup", 5);
  f.attack.fire("click", 5, 0, 0, { detail: 1 });
  assert.deepEqual(f.actions, ["attack"], "compatibility click cannot fire a second attack");
  f.attack.fire("click", 5, 0, 0, { detail: 0 });
  assert.deepEqual(f.actions, ["attack", "attack"]);
  assert.equal(f.enables(), 1);
});
