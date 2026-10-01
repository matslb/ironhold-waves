import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRangerBowPoseSystem } from "../src/systems/rangerBowPose.js";
import { createArmGripSolver } from "../src/systems/characterGrip.js";

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  copy(v) { return this.set(v.x, v.y, v.z); }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { return this.set(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v) { return this.set(this.x - v.x, this.y - v.y, this.z - v.z); }
  multiplyScalar(s) { return this.set(this.x * s, this.y * s, this.z * s); }
  addScaledVector(v, s) { return this.set(this.x + v.x * s, this.y + v.y * s, this.z + v.z * s); }
  lerp(v, s) { return this.set(this.x + (v.x - this.x) * s, this.y + (v.y - this.y) * s, this.z + (v.z - this.z) * s); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  lengthSq() { return this.dot(this); }
  length() { return Math.sqrt(this.lengthSq()); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  normalize() { return this.multiplyScalar(1 / (this.length() || 1)); }
  applyQuaternion(q) {
    const { x, y, z } = this;
    const ix = q.w * x + q.y * z - q.z * y, iy = q.w * y + q.z * x - q.x * z, iz = q.w * z + q.x * y - q.y * x;
    const iw = -q.x * x - q.y * y - q.z * z;
    return this.set(ix * q.w - iw * q.x - iy * q.z + iz * q.y, iy * q.w - iw * q.y - iz * q.x + ix * q.z, iz * q.w - iw * q.z - ix * q.y + iy * q.x);
  }
}
class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.set(x, y, z, w); }
  set(x, y, z, w) { Object.assign(this, { x, y, z, w }); return this; }
  copy(q) { return this.set(q.x, q.y, q.z, q.w); }
  clone() { return new Quaternion(this.x, this.y, this.z, this.w); }
  normalize() { const d = Math.hypot(this.x, this.y, this.z, this.w) || 1; return this.set(this.x / d, this.y / d, this.z / d, this.w / d); }
  setFromAxisAngle(v, a) { const s = Math.sin(a / 2); return this.set(v.x * s, v.y * s, v.z * s, Math.cos(a / 2)); }
  setFromUnitVectors(a, b) {
    const w = a.dot(b) + 1;
    if (w < 1e-7) this.set(0, -a.z, a.y, 0);
    else this.set(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x, w);
    return this.normalize();
  }
}
class Group {
  constructor() { this.position = new Vector3(); this.scale = new Vector3(1, 1, 1); this.quaternion = new Quaternion(); this.rotation = new Vector3(); this.children = []; this.userData = {}; }
  add(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  localToWorld(v) { v.set(v.x * this.scale.x, v.y * this.scale.y, v.z * this.scale.z).applyQuaternion(this.quaternion).add(this.position); return this.parent ? this.parent.localToWorld(v) : v; }
  worldToLocal(v) {
    this.parent?.worldToLocal(v);
    v.sub(this.position).applyQuaternion(new Quaternion(-this.quaternion.x, -this.quaternion.y, -this.quaternion.z, this.quaternion.w));
    return v.set(v.x / this.scale.x, v.y / this.scale.y, v.z / this.scale.z);
  }
}
class Mesh extends Group { constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); } }
class BoxGeometry { constructor(width, height, depth) { this.parameters = { width, height, depth }; } }
class CylinderGeometry { constructor(a, b, height) { this.parameters = { height }; } }
class Geometry { constructor() { this.parameters = {}; } }
class Material { clone() { return new Material(); } }
const THREE = process.env.RANGER_BOW_THREE_MODULE
  ? await import(process.env.RANGER_BOW_THREE_MODULE)
  : { Vector3, Quaternion, Group, Mesh, BoxGeometry, CylinderGeometry, TorusGeometry: Geometry };
const runtime = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
function source(name) { const start = runtime.indexOf(`  function ${name}(`); return runtime.slice(start, runtime.indexOf("\n  function ", start + 1)); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
function builders() {
  const materials = new Proxy({}, { get() { return THREE.MeshStandardMaterial ? new THREE.MeshStandardMaterial() : new Material(); } });
  const cached = new Map();
  const makeBox = (w, h, d, material, x, y, z) => {
    const key = [w, h, d].join(); if (!cached.has(key)) cached.set(key, new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(cached.get(key), material); mesh.position.set(x, y, z); return mesh;
  };
  const makeCylinder = (a, b, h, segments, material, x, y, z) => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(a, b, h, segments), material); mesh.position.set(x, y, z); return mesh; };
  const makeSphere = (r, material, x, y, z) => { const mesh = new THREE.Mesh(THREE.SphereGeometry ? new THREE.SphereGeometry(r) : new Geometry(), material); mesh.position.set(x, y, z); return mesh; };
  return new Function("THREE", "materials", "makeBox", "makeCylinder", "makeSphere", "addShadow", `${source("buildRangerWeapon")}\nreturn buildRangerWeapon;`)(THREE, materials, makeBox, makeCylinder, makeSphere, object => object);
}
function actor(weapon) {
  const root = new THREE.Group(); const pivot = new THREE.Group(); pivot.position.set(-0.56, 1, -0.08); pivot.add(weapon); root.add(pivot);
  function arm(side) {
    const arm = new THREE.Group(); arm.position.set(side * 0.55, 1.74, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.38)); upper.position.y = -0.19;
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.36)); forearm.position.y = -0.56;
    const hand = new THREE.Group(); hand.position.y = -0.79;
    arm.add(upper, forearm, hand); arm.userData.gripRig = { upper, forearm, hand, upperLength: 0.38, lowerLength: 0.4 }; root.add(arm); return arm;
  }
  return { root, weaponPivot: pivot, leftArm: arm(-1), rightArm: arm(1), character: "ranger" };
}
function point(object, x = 0, y = 0, z = 0) { return object.localToWorld(new THREE.Vector3(x, y, z)); }
function close(a, b) { assert.ok(a.distanceTo(b) < 1e-6, `endpoint separation ${a.distanceTo(b)}`); }

test("all three Ranger kits have two shared string boxes that join tips and the drawn midpoint", () => {
  const build = builders(); const update = createRangerBowPoseSystem({ THREE }); let cachedGeometry;
  for (const kit of ["ranger_ash_bow", "ranger_crownring_recurve", "ranger_briarstring_bow"]) {
    const weapon = build(kit); const a = actor(weapon); const string = update(a, 1);
    assert.equal(string.upper.geometry, string.lower.geometry);
    if (cachedGeometry) assert.equal(string.upper.geometry, cachedGeometry); else cachedGeometry = string.upper.geometry;
    assert.equal(cachedGeometry.parameters.height, 1);
    for (const [mesh, tip] of [[string.upper, 0.48], [string.lower, -0.48]]) {
      close(point(mesh, 0, 0.5), point(weapon, 0, tip, 0.15));
      close(point(mesh, 0, -0.5), point(weapon, string.center.x, string.center.y, string.center.z));
    }
    assert.ok(string.center.distanceTo(new THREE.Vector3(0, 0, 0.15)) > 0.3);
  }
});

test("local and remote shot/parting poses lift the bow and keep both hands within two-link reach", () => {
  const update = createRangerBowPoseSystem({ THREE }); const align = createArmGripSolver({ THREE }); const build = builders();
  const shared = new Function("clamp", "lerp", "smoothstep", "updateRangerBowPose", `${source("updateRangerShotPose")}\n${source("updateRangerPartingPose")}\nreturn { shot:updateRangerShotPose, parting:updateRangerPartingPose };`)(clamp, lerp, smoothstep, update);
  for (const kind of ["arrow", "pierce", "heartseeker", "parting"]) {
    const a = actor(build("ranger_crownring_recurve"));
    a.root.position.set(13, 4, -7); a.root.scale.set(1.2, 0.9, 1.1); a.root.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.8);
    for (let frame = 0; frame <= 100; frame++) {
      const t = frame / 100;
      if (kind === "parting") shared.parting(a, Math.pow(1 - t, 0.6)); else shared.shot(a, t, Math.sin(t * Math.PI), kind);
      const string = a.weaponPivot.children[0].userData.bowString;
      const leftTarget = a.leftArm.worldToLocal(point(a.weaponPivot, 0, 0, -0.1));
      assert.ok(leftTarget.length() <= 0.78 + 1e-6, `${kind} bow hand reach`);
      align(a.leftArm, a.weaponPivot, { side: -1, point: { x: 0, y: 0, z: -0.1 } });
      if (string.drawAmount > 0) {
        const target = point(a.weaponPivot.children[0], string.center.x, string.center.y, string.center.z);
        assert.ok(a.rightArm.worldToLocal(target.clone()).length() <= 0.78 * 0.98 + 1e-6, `${kind} string hand reach`);
        align(a.rightArm, a.weaponPivot.children[0], string.gripOptions);
        close(point(a.rightArm.userData.gripRig.hand), target);
      }
      if ((kind === "parting" && frame === 0) || (kind !== "parting" && frame === 50)) assert.ok(a.weaponPivot.position.y > 1.59, `${kind} chest-height bow`);
    }
  }
});

test("idle or mounted reset releases the string hand and restores arm children while authored group easing stays intact", () => {
  const update = createRangerBowPoseSystem({ THREE }); const align = createArmGripSolver({ THREE }); const a = actor(builders()("ranger_ash_bow"));
  const rig = a.rightArm.userData.gripRig; const rest = [rig.upper.position.clone(), rig.forearm.position.clone(), rig.hand.position.clone()];
  const string = update(a, 1); align(a.rightArm, a.weaponPivot.children[0], string.gripOptions);
  a.rightArm.rotation.x = -0.7;
  update(a, 0, 0.2);
  assert.equal(string.drawAmount, 0); assert.equal(a.rightArm.rotation.x, -0.7);
  close(rig.upper.position, rest[0]); close(rig.forearm.position, rest[1]); close(rig.hand.position, rest[2]);
  assert.ok(a.weaponPivot.position.y > 1 && a.weaponPivot.position.y < 1.62);
  close(string.center, new THREE.Vector3(0, 0, 0.15));
  for (let frame = 0; frame < 100; frame++) update(a, 0, 0.2);
  assert.ok(Math.abs(a.weaponPivot.position.y - 1) < 1e-6); assert.ok(Math.abs(a.weaponPivot.position.z + 0.08) < 1e-6);
  assert.equal(string.upper.geometry.parameters.height, 1);
});
