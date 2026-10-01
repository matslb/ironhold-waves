import test from "node:test";
import assert from "node:assert/strict";
import { createArmGripSolver } from "../src/systems/characterGrip.js";

// Offline transform double; CHARACTER_GRIP_THREE_MODULE also runs these tests
// against the exact Three module used by the browser without a repo dependency.
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  copy(v) { return this.set(v.x, v.y, v.z); }
  add(v) { return this.set(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v) { return this.set(this.x - v.x, this.y - v.y, this.z - v.z); }
  multiplyScalar(s) { return this.set(this.x * s, this.y * s, this.z * s); }
  addScaledVector(v, s) { return this.set(this.x + v.x * s, this.y + v.y * s, this.z + v.z * s); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  lengthSq() { return this.dot(this); }
  length() { return Math.sqrt(this.lengthSq()); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  normalize() { return this.multiplyScalar(1 / (this.length() || 1)); }
  applyQuaternion(q) {
    const { x, y, z } = this;
    const ix = q.w * x + q.y * z - q.z * y;
    const iy = q.w * y + q.z * x - q.x * z;
    const iz = q.w * z + q.x * y - q.y * x;
    const iw = -q.x * x - q.y * y - q.z * z;
    return this.set(ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
      iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
      iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x);
  }
}
class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.set(x, y, z, w); }
  set(x, y, z, w) { Object.assign(this, { x, y, z, w }); return this; }
  copy(q) { return this.set(q.x, q.y, q.z, q.w); }
  normalize() { const d = Math.hypot(this.x, this.y, this.z, this.w) || 1; return this.set(this.x / d, this.y / d, this.z / d, this.w / d); }
  setFromAxisAngle(v, angle) { const s = Math.sin(angle / 2); return this.set(v.x * s, v.y * s, v.z * s, Math.cos(angle / 2)); }
  setFromUnitVectors(a, b) {
    const w = a.dot(b) + 1;
    if (w < 1e-7) {
      if (Math.abs(a.x) > Math.abs(a.z)) this.set(-a.y, a.x, 0, 0);
      else this.set(0, -a.z, a.y, 0);
    } else this.set(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x, w);
    return this.normalize();
  }
}
class Group {
  constructor() { this.position = new Vector3(); this.scale = new Vector3(1, 1, 1); this.quaternion = new Quaternion(); this.children = []; this.parent = null; this.userData = {}; }
  add(...children) { for (const child of children) { child.parent = this; this.children.push(child); } return this; }
  localToWorld(v) {
    v.set(v.x * this.scale.x, v.y * this.scale.y, v.z * this.scale.z).applyQuaternion(this.quaternion).add(this.position);
    return this.parent ? this.parent.localToWorld(v) : v;
  }
  worldToLocal(v) {
    this.parent?.worldToLocal(v);
    v.sub(this.position).applyQuaternion(new Quaternion(-this.quaternion.x, -this.quaternion.y, -this.quaternion.z, this.quaternion.w));
    return v.set(v.x / this.scale.x, v.y / this.scale.y, v.z / this.scale.z);
  }
}
class Mesh extends Group { constructor(geometry) { super(); this.geometry = geometry; } }
class CylinderGeometry { constructor(a, b, height) { this.parameters = { height }; } }
const THREE = process.env.CHARACTER_GRIP_THREE_MODULE
  ? await import(process.env.CHARACTER_GRIP_THREE_MODULE)
  : { Vector3, Quaternion, Group, Mesh, CylinderGeometry };

function fixture(side = 1) {
  const actor = new THREE.Group();
  const arm = new THREE.Group();
  arm.position.set(side * 0.58, 1.72, 0);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4)); upper.position.y = -0.2;
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.38)); forearm.position.y = -0.58;
  const elbow = new THREE.Group(); elbow.position.y = -0.4;
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.18)); cuff.position.y = -0.68;
  const hand = new THREE.Group(); hand.position.y = -0.8;
  arm.userData.gripRig = { upper, forearm, elbow, cuff, hand, upperLength: 0.4, lowerLength: 0.4 };
  arm.add(upper, forearm, elbow, cuff, hand);
  const pivot = new THREE.Group();
  actor.add(arm, pivot);
  return { actor, arm, pivot, upper, forearm, elbow, cuff, hand };
}
function close(actual, expected, label = "point", tolerance = 1e-6) {
  assert.ok(actual.distanceTo(expected) < tolerance, `${label}: (${actual.x}, ${actual.y}, ${actual.z}) vs (${expected.x}, ${expected.y}, ${expected.z})`);
}
function point(object, x = 0, y = 0, z = 0) { return object.localToWorld(new THREE.Vector3(x, y, z)); }
function axisRotation(object, x, y, z, angle) { object.quaternion.setFromAxisAngle(new THREE.Vector3(x, y, z).normalize(), angle); }
function setTarget(f, x, y, z) { f.pivot.position.copy(f.arm.position).add(new THREE.Vector3(x, y, z)); }

test("hand follows a moving handle through actor and existing arm transforms without moving the weapon", () => {
  const align = createArmGripSolver({ THREE });
  const f = fixture();
  f.actor.position.set(13, 4, -9); f.actor.scale.set(1.3, 0.9, 1.1);
  axisRotation(f.actor, 1, 2, 0.2, 0.7);
  axisRotation(f.arm, 1, 0, 1, -0.65);
  axisRotation(f.pivot, 1, 2, 3, 0.4);
  f.pivot.position.set(0.66, 1.12, -0.04);
  const grip = { x: 0, y: 0, z: -0.1 };
  const before = point(f.pivot, grip.x, grip.y, grip.z);
  const position = { ...f.pivot.position }; const rotation = { ...f.pivot.quaternion };
  assert.equal(align(f.arm, f.pivot, { point: grip }), true);
  close(point(f.hand), before, "hand at handle");
  assert.deepEqual({ ...f.pivot.position }, position);
  assert.deepEqual({ ...f.pivot.quaternion }, rotation);
  f.pivot.position.z -= 0.42;
  align(f.arm, f.pivot, { point: grip });
  close(point(f.hand), point(f.pivot, grip.x, grip.y, grip.z), "moving grip");
});

test("both cylinder links join shoulder, elbow and hand despite different original geometry lengths", () => {
  const align = createArmGripSolver({ THREE }); const f = fixture();
  setTarget(f, 0.1, -0.5, -0.05);
  align(f.arm, f.pivot);
  close(point(f.upper, 0, 0.2), point(f.arm), "upper at shoulder");
  close(point(f.upper, 0, -0.2), point(f.elbow), "upper at elbow");
  close(point(f.forearm, 0, 0.19), point(f.elbow), "forearm at elbow");
  close(point(f.forearm, 0, -0.19), point(f.hand), "forearm at hand");
  assert.ok(f.cuff.position.distanceTo(f.hand.position) < 0.13);
});

test("mirrored neutral elbows bend outward and back instead of across the torso", () => {
  const align = createArmGripSolver({ THREE }); const right = fixture(1); const left = fixture(-1);
  setTarget(right, 0, -0.5, 0); setTarget(left, 0, -0.5, 0);
  align(right.arm, right.pivot, { side: 1 }); align(left.arm, left.pivot, { side: -1 });
  assert.ok(right.elbow.position.x > 0); assert.ok(left.elbow.position.x < 0);
  assert.ok(right.elbow.position.z > 0); assert.ok(left.elbow.position.z > 0);
  assert.ok(Math.abs(right.elbow.position.x + left.elbow.position.x) < 1e-9);
  assert.ok(Math.abs(right.elbow.position.z - left.elbow.position.z) < 1e-9);
});

test("unreachable attacks stretch links evenly without accumulating scale or changing shared geometry", () => {
  const align = createArmGripSolver({ THREE }); const f = fixture();
  const upperGeometry = f.upper.geometry; const lowerGeometry = f.forearm.geometry;
  setTarget(f, 0.15, -0.7, -1.1);
  for (let frame = 0; frame < 200; frame++) align(f.arm, f.pivot);
  close(point(f.hand), point(f.pivot), "extended grip");
  close(point(f.upper, 0, -0.2), point(f.elbow), "extended upper");
  close(point(f.forearm, 0, -0.19), point(f.hand), "extended forearm");
  const expectedLength = new THREE.Vector3(0.15, -0.7, -1.1).length() / 2;
  assert.ok(Math.abs(f.upper.scale.y - expectedLength / 0.4) < 1e-9);
  assert.ok(Math.abs(f.forearm.scale.y - expectedLength / 0.38) < 1e-9);
  assert.equal(f.upper.geometry, upperGeometry); assert.equal(f.forearm.geometry, lowerGeometry);
  assert.equal(upperGeometry.parameters.height, 0.4); assert.equal(lowerGeometry.parameters.height, 0.38);
  setTarget(f, 0, -0.5, 0); align(f.arm, f.pivot);
  assert.ok(Math.abs(f.upper.scale.y - 1) < 1e-9);
});

test("folded and bend-axis-aligned targets remain finite; absent rigs are harmless", () => {
  const align = createArmGripSolver({ THREE }); const f = fixture();
  for (const target of [[0, 0, 0], [0.5, 0, 0.325], [0, -1e-8, 0]]) {
    setTarget(f, ...target); assert.equal(align(f.arm, f.pivot), true);
    close(point(f.hand), point(f.pivot));
    for (const object of [f.upper, f.forearm, f.elbow, f.hand]) {
      assert.ok(Number.isFinite(object.position.x + object.position.y + object.position.z));
      assert.ok(Number.isFinite(object.quaternion.x + object.quaternion.y + object.quaternion.z + object.quaternion.w));
    }
  }
  assert.equal(align(new THREE.Group(), f.pivot), false);
  assert.equal(align(f.arm, null), false);
});
