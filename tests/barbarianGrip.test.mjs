import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createArmGripSolver } from "../src/systems/characterGrip.js";

// The actual Barbarian builder and grip solver run offline. Set either model
// or grip Three-module variable to verify the same joins with Three transforms.
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  setScalar(v) { return this.set(v, v, v); }
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
class Euler {
  constructor(quaternion) { this.quaternion = quaternion; this._x = this._y = this._z = 0; }
  get x() { return this._x; } set x(value) { this._x = value; this.update(); }
  get y() { return this._y; } set y(value) { this._y = value; this.update(); }
  get z() { return this._z; } set z(value) { this._z = value; this.update(); }
  set(x, y, z) { this._x = x; this._y = y; this._z = z; this.update(); return this; }
  update() {
    const c1 = Math.cos(this._x / 2), c2 = Math.cos(this._y / 2), c3 = Math.cos(this._z / 2);
    const s1 = Math.sin(this._x / 2), s2 = Math.sin(this._y / 2), s3 = Math.sin(this._z / 2);
    this.quaternion.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3);
  }
}
class Group {
  constructor() { this.position = new Vector3(); this.scale = new Vector3(1, 1, 1); this.quaternion = new Quaternion(); this.rotation = new Euler(this.quaternion); this.children = []; this.parent = null; this.userData = {}; }
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
class Mesh extends Group { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
class CylinderGeometry { constructor(a, b, height) { this.parameters = { height }; } }

class Geometry { constructor(...args) { this.parameters = { args }; } }
class Material { constructor() {} clone() { return new Material(); } }
const actualModule = process.env.CHARACTER_MODELS_THREE_MODULE || process.env.CHARACTER_GRIP_THREE_MODULE;
const THREE = actualModule ? await import(actualModule) : {
  Vector3, Quaternion, Group, Mesh, CylinderGeometry, BoxGeometry: Geometry, SphereGeometry: Geometry, ConeGeometry: Geometry,
  PlaneGeometry: Geometry, RingGeometry: Geometry, TorusGeometry: Geometry, MeshBasicMaterial: Material, MeshStandardMaterial: Material, DoubleSide: 2
};
const source = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
function model(scale = 1.17, name = "createBarbarianModel") {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf("\n  function ", start + 1);
  assert.ok(start >= 0 && end > start);
  const materials = new Proxy({}, { get(target, name) { return target[name] ||= new THREE.MeshStandardMaterial(); } });
  const mesh = (geometry, material, x = 0, y = 0, z = 0) => {
    const result = new THREE.Mesh(geometry, material); result.position.set(x, y, z); return result;
  };
  const context = {
    THREE, materials,
    makeCreatureHealthBar(y) {
      const healthRoot = new THREE.Group(); healthRoot.position.y = y;
      const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(.8, .04), materials.danger);
      healthRoot.add(hpFill); return { healthRoot, hpFill };
    },
    makeBox: (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z),
    makeCylinder: (a, b, h, n, m, x, y, z) => mesh(new THREE.CylinderGeometry(a, b, h, n), m, x, y, z),
    makeSphere: (r, m, x, y, z) => mesh(new THREE.SphereGeometry(r, 20, 14), m, x, y, z),
    makeCone: (r, h, n, m, x, y, z) => mesh(new THREE.ConeGeometry(r, h, n), m, x, y, z)
  };
  return new Function(...Object.keys(context), `${source.slice(start, end)}\nreturn ${name};`)(...Object.values(context))(scale);
}
function point(object, x = 0, y = 0, z = 0) { return object.localToWorld(new THREE.Vector3(x, y, z)); }
function close(a, b, label) { assert.ok(a.distanceTo(b) < 1e-6, `${label}: ${a.x},${a.y},${a.z} vs ${b.x},${b.y},${b.z}`); }

test("Barbarian bracers remain at their previous rest positions and belong to shoulder arms", () => {
  const actor = model();
  for (const [arm, side] of [[actor.leftArm, -1], [actor.rightArm, 1]]) {
    const rig = arm.userData.gripRig;
    assert.ok(rig.upper && rig.forearm && rig.hand && rig.cuff);
    assert.equal(rig.cuff.parent, arm);
    close(point(rig.cuff), new THREE.Vector3(side * .58 * 1.17, 1.02 * 1.17, -.01 * 1.17), "original bracer position");
    const before = point(rig.cuff);
    arm.rotation.x = -.6;
    assert.ok(point(rig.cuff).distanceTo(before) > .2, "bracer follows its shoulder");
  }
});

test("Barbarian fist and both arm links follow axe rest, slash and heavy poses without changing the weapon", () => {
  const actor = model(), align = createArmGripSolver({ THREE });
  actor.group.position.set(13, 2.4, -8);
  actor.group.rotation.set(.04, .65, 0);
  const rig = actor.rightArm.userData.gripRig;
  const grip = { x: 0, y: 0, z: -.2 };
  const weaponParts = [...actor.weaponPivot.children];
  const originalUpperGeometry = rig.upper.geometry, originalForearmGeometry = rig.forearm.geometry;
  for (const pose of [[-.12, -.3, -.7], [-.18, -.45, -.34], [.52, 1.2, -.34], [-1.25, -.18, .12], [1, -.18, .12]]) {
    actor.weaponPivot.rotation.set(...pose);
    const weaponPosition = point(actor.weaponPivot);
    const target = point(actor.weaponPivot, 0, 0, -.2);
    for (let frame = 0; frame < 30; frame++) assert.equal(align(actor.rightArm, actor.weaponPivot, { point: grip }), true);
    close(point(rig.hand), target, "fist meets leather axe wrap");
    close(point(rig.upper, 0, .2), point(actor.rightArm), "upper arm joins fixed shoulder");
    close(point(rig.upper, 0, -.2), point(rig.forearm, 0, .19), "elbow joins both links");
    close(point(rig.forearm, 0, -.19), point(rig.hand), "forearm joins fist");
    assert.ok(point(rig.cuff).distanceTo(point(rig.hand)) < .3, "bracer stays on the held arm");
    close(point(actor.weaponPivot), weaponPosition, "weapon pivot remains fixed");
    assert.deepEqual([actor.weaponPivot.rotation.x, actor.weaponPivot.rotation.y, actor.weaponPivot.rotation.z], pose);
  }
  assert.deepEqual(actor.weaponPivot.children, weaponParts);
  assert.equal(rig.upper.geometry, originalUpperGeometry); assert.equal(rig.forearm.geometry, originalForearmGeometry);
  assert.equal(originalUpperGeometry.parameters.height, .4); assert.equal(originalForearmGeometry.parameters.height, .38);
});


test("Bonewarden's articulated bones join a fixed shoulder to the existing sword grip through attacks", () => {
  const actor = model(1.1, "createBonewardenModel"), align = createArmGripSolver({ THREE });
  actor.group.position.set(-7, 3.2, 4); actor.group.rotation.y = -.3;
  const rig = actor.rightArm.userData.gripRig;
  assert.equal(rig.upper.parent, actor.rightArm, "upper bone belongs to fixed arm");
  assert.equal(rig.forearm.parent, actor.rightArm, "forearm belongs to fixed arm");
  assert.equal(rig.hand.parent, actor.rightArm, "hand belongs to fixed arm");
  const shoulder = point(actor.rightArm), pivot = point(actor.weaponPivot);
  const weaponChildren = [...actor.weaponPivot.children];
  assert.equal(weaponChildren.length, 5, "loose arm bone removed from sword pivot");
  for (const pose of [[-.12, -.3, -.7], [.52, 1.2, -.34], [-1.25, -.18, .12], [1, -.18, .12]]) {
    actor.weaponPivot.rotation.set(...pose);
    assert.equal(align(actor.rightArm, actor.weaponPivot, { point: { x: 0, y: 0, z: -.4 } }), true);
    close(point(actor.rightArm), shoulder, "shoulder anchor remains fixed");
    close(point(rig.upper, 0, .25), shoulder, "upper bone touches shoulder");
    close(point(rig.upper, 0, -.25), point(rig.forearm, 0, .19), "two bones meet at elbow");
    close(point(rig.forearm, 0, -.19), point(rig.hand), "forearm reaches knuckle hand");
    close(point(rig.hand), point(actor.weaponPivot, 0, 0, -.4), "knuckles hold existing sword wrap");
    close(point(actor.weaponPivot), pivot, "sword pivot position unchanged");
    assert.deepEqual([actor.weaponPivot.rotation.x, actor.weaponPivot.rotation.y, actor.weaponPivot.rotation.z], pose);
  }
  assert.deepEqual(actor.weaponPivot.children, weaponChildren);
});
