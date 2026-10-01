import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Test actual creature builders with analytic offline contacts or optional
// Three triangle raycasts from the exact browser module.
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  setScalar(v) { return this.set(v, v, v); }
  clone() { return new Vector3(this.x, this.y, this.z); }
  copy(v) { return this.set(v.x, v.y, v.z); }
  add(v) { return this.set(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v) { return this.set(this.x - v.x, this.y - v.y, this.z - v.z); }
  normalize() { const d = Math.hypot(this.x, this.y, this.z) || 1; return this.set(this.x / d, this.y / d, this.z / d); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
}
function rotate(v, e, inverse = false) {
  const axes = inverse ? ["x", "y", "z"] : ["z", "y", "x"];
  for (const axis of axes) {
    const a = e[axis] * (inverse ? -1 : 1), c = Math.cos(a), s = Math.sin(a);
    const { x, y, z } = v;
    if (axis === "x") v.set(x, y * c - z * s, y * s + z * c);
    if (axis === "y") v.set(x * c + z * s, y, z * c - x * s);
    if (axis === "z") v.set(x * c - y * s, x * s + y * c, z);
  }
  return v;
}
class Group {
  constructor() {
    this.position = new Vector3(); this.rotation = new Vector3(); this.scale = new Vector3(1, 1, 1);
    this.children = []; this.userData = {}; this.visible = true; this.parent = null;
  }
  add(...children) { for (const child of children) { child.parent = this; this.children.push(child); } return this; }
  traverse(fn) { fn(this); for (const child of this.children) child.traverse(fn); }
  updateMatrixWorld() {}
  localToWorld(v) {
    v.set(v.x * this.scale.x, v.y * this.scale.y, v.z * this.scale.z);
    rotate(v, this.rotation).add(this.position);
    return this.parent ? this.parent.localToWorld(v) : v;
  }
  worldToLocal(v) {
    this.parent?.worldToLocal(v); v.sub(this.position); rotate(v, this.rotation, true);
    return v.set(v.x / this.scale.x, v.y / this.scale.y, v.z / this.scale.z);
  }
}
class Mesh extends Group { constructor(geometry, material) { super(); Object.assign(this, { geometry, material, isMesh: true }); } }
class Material {
  constructor() { this.name = ""; this.color = { setHex() {} }; }
  clone() { const copy = new Material(); copy.name = this.name; return copy; }
}
class BoxGeometry { constructor(width, height, depth) { this.type = "BoxGeometry"; this.parameters = { width, height, depth }; } }
class CylinderGeometry { constructor(radiusTop, radiusBottom, height) { this.type = "CylinderGeometry"; this.parameters = { radiusTop, radiusBottom, height }; } }
class ConeGeometry extends CylinderGeometry { constructor(radius, height) { super(0, radius, height); this.type = "ConeGeometry"; } }
class SphereGeometry {
  constructor(radius, width, height, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI) {
    this.type = "SphereGeometry"; this.parameters = { radius, phiStart, phiLength, thetaStart, thetaLength };
  }
}
class TorusGeometry { constructor(radius, tube, radial, tubular, arc = Math.PI * 2) { this.type = "TorusGeometry"; this.parameters = { radius, tube, arc }; } }
class RingGeometry { constructor(innerRadius, outerRadius) { this.type = "RingGeometry"; this.parameters = { innerRadius, outerRadius }; } }

class PlaneGeometry { constructor(width, height) { this.type = "PlaneGeometry"; this.parameters = { width, height, depth: 0 }; } }
const THREE = process.env.CHARACTER_MODELS_THREE_MODULE
  ? await import(process.env.CHARACTER_MODELS_THREE_MODULE)
  : { Vector3, Group, Mesh, MeshStandardMaterial: Material, MeshBasicMaterial: Material, BoxGeometry, CylinderGeometry,
    ConeGeometry, SphereGeometry, TorusGeometry, RingGeometry, PlaneGeometry, DoubleSide: 2 };
const source = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
function functionSource(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  let depth = 0, quote = "", comment = "";
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (comment === "line") { if (c === "\n") comment = ""; continue; }
    if (comment === "block") { if (c === "*" && next === "/") { comment = ""; i++; } continue; }
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; }
    if (c === "/" && next === "/") { comment = "line"; i++; continue; }
    if (c === "/" && next === "*") { comment = "block"; i++; continue; }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    if (c === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed builder: ${name}`);
}

function model(name, scale = 1.18) {
  const materials = new Proxy({}, { get(target, key) {
    if (!target[key]) { target[key] = new THREE.MeshStandardMaterial(); target[key].name = key; }
    return target[key];
  } });
  const mesh = (geometry, material, x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); return object;
  };
  const context = {
    THREE, materials,
    makeBox: (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z),
    makeCylinder: (a, b, h, n, m, x, y, z) => mesh(new THREE.CylinderGeometry(a, b, h, n), m, x, y, z),
    makeCone: (r, h, n, m, x, y, z) => mesh(new THREE.ConeGeometry(r, h, n), m, x, y, z),
    makeSphere: (r, m, x, y, z) => mesh(new THREE.SphereGeometry(r, 20, 14), m, x, y, z),
    makeCreatureHealthBar(y) {
      const healthRoot = new THREE.Group(), hpFill = mesh(new THREE.PlaneGeometry(.8, .04), materials.danger);
      healthRoot.position.y = y; healthRoot.add(hpFill); return { healthRoot, hpFill };
    }
  };
  return new Function(...Object.keys(context), `${functionSource(name)}\nreturn ${name};`)(...Object.values(context))(scale);
}
const point = (object, x = 0, y = 0, z = 0) => object.localToWorld(new THREE.Vector3(x, y, z));
function meshes(group) { const parts = []; group.traverse(object => { if (object.isMesh) parts.push(object); }); return parts; }
function boxBottom(object) {
  const p = object.geometry.parameters, ys = [];
  for (const x of [-p.width / 2, p.width / 2]) for (const y of [-p.height / 2, p.height / 2])
    for (const z of [-p.depth / 2, p.depth / 2]) ys.push(point(object, x, y, z).y);
  return Math.min(...ys);
}
function analyticRayDistance(object, origin, direction) {
  const a = object.worldToLocal(origin.clone());
  const step = origin.clone().add(direction); object.worldToLocal(step);
  const d = step.sub(a), p = object.geometry.parameters;
  if (object.geometry.type === "SphereGeometry") {
    const aa = d.x ** 2 + d.y ** 2 + d.z ** 2;
    const bb = 2 * (a.x * d.x + a.y * d.y + a.z * d.z);
    const cc = a.x ** 2 + a.y ** 2 + a.z ** 2 - p.radius ** 2;
    const disc = bb ** 2 - 4 * aa * cc;
    if (disc < 0) return Infinity;
    return Math.min(...[(-bb - Math.sqrt(disc)) / (2 * aa), (-bb + Math.sqrt(disc)) / (2 * aa)].filter(t => t >= 0));
  }
  if (object.geometry.type !== "BoxGeometry") return Infinity;
  let enter = 0, leave = Infinity;
  for (const [axis, size] of [["x", p.width], ["y", p.height], ["z", p.depth]]) {
    if (Math.abs(d[axis]) < 1e-10) { if (Math.abs(a[axis]) > size / 2) return Infinity; continue; }
    const t0 = (-size / 2 - a[axis]) / d[axis], t1 = (size / 2 - a[axis]) / d[axis];
    enter = Math.max(enter, Math.min(t0, t1)); leave = Math.min(leave, Math.max(t0, t1));
    if (enter > leave) return Infinity;
  }
  return enter;
}
function firstHit(group, objects, origin, direction) {
  group.updateMatrixWorld(true);
  if (THREE.Raycaster) return new THREE.Raycaster(origin, direction, 0, 100).intersectObjects(objects, false)[0];
  const hits = objects.map(object => ({ object, distance: analyticRayDistance(object, origin, direction) }))
    .filter(hit => Number.isFinite(hit.distance)).sort((a, b) => a.distance - b.distance);
  return hits[0];
}
function coneBase(cone) { return point(cone, 0, -cone.geometry.parameters.height / 2, 0); }
function coneTip(cone) { return point(cone, 0, cone.geometry.parameters.height / 2, 0); }

test("Briar Beast and Bog Lurker feet rest on terrain and stay on their animated legs", () => {
  for (const name of ["createBriarBeastModel", "createBogLurkerModel"]) {
    const actor = model(name); actor.group.position.y = 2.75;
    for (const leg of actor.quadrupedLegs || [actor.leftLeg, actor.rightLeg]) {
      const foot = meshes(leg).find(object => object.geometry.type === "BoxGeometry");
      assert.ok(foot);
      assert.ok(Math.abs(boxBottom(foot) - 2.75) < 1e-6, `${name} foot meets ground`);
      const before = point(foot); leg.rotation.x = .34;
      assert.ok(point(foot).distanceTo(before) > .15, `${name} foot follows stride`);
    }
  }
});

test("Briar Beast horns flare outward and dorsal spikes stay rooted in its body", () => {
  const actor = model("createBriarBeastModel");
  const horns = actor.headPivot.children.filter(object => object.geometry.type === "ConeGeometry" && object.geometry.parameters.height === .36);
  assert.equal(horns.length, 2);
  for (const horn of horns) {
    const base = coneBase(horn), tip = coneTip(horn), side = Math.sign(horn.position.x);
    assert.ok((tip.x - base.x) * side > .1, "horn grows away from head center");
    assert.ok(tip.y > base.y, "horn points upward");
  }
  const all = meshes(actor.group);
  const spine = actor.group.children.find(object => object.children.length === 7);
  const supports = all.filter(object => object.parent === actor.group &&
    (object.geometry.type === "SphereGeometry" && object.material.name === "rootwood" || object.material.name === "briarLeaf"));
  for (const spike of spine.children) {
    const base = coneBase(spike), origin = new THREE.Vector3(base.x, 10, base.z);
    const hit = firstHit(actor.group, supports, origin, new THREE.Vector3(0, -1, 0));
    assert.ok(hit, "spike has body or mantle under its root");
    const surfaceY = origin.y - hit.distance;
    assert.ok(base.y <= surfaceY + 1e-5, "spike root does not hover above body");
    assert.ok(surfaceY - base.y < .07, "spike root remains at the surface");
  }
});

test("Bog Lurker eyes are visible in front of the scaled head beneath its brow", () => {
  const actor = model("createBogLurkerModel"), all = meshes(actor.group);
  const head = all.find(object => object.geometry.type === "SphereGeometry" && object.position.z === -.86);
  const brow = all.find(object => object.geometry.type === "BoxGeometry" && object.position.y === 1.18);
  const eyes = all.filter(object => object.material.name === "emberEye");
  assert.equal(eyes.length, 2);
  for (const eye of eyes) {
    const origin = point(eye); origin.z = -4;
    const hit = firstHit(actor.group, [head, brow, ...eyes], origin, new THREE.Vector3(0, 0, 1));
    assert.equal(hit?.object, eye, "eye center has a clear frontal sight line");
    const center = head.worldToLocal(point(eye));
    const radius = head.geometry.parameters.radius;
    assert.ok(Math.hypot(center.x, center.y, center.z) < radius + .06, "eye intersects skin rather than floating");
  }
});

test("Bog Lurker tusks rise from its jaw and downturned claws remain attached to hands", () => {
  const actor = model("createBogLurkerModel"), all = meshes(actor.group);
  const jaw = all.find(object => object.geometry.type === "BoxGeometry" && object.position.y === .84);
  const tusks = all.filter(object => object.geometry.type === "ConeGeometry" && object.geometry.parameters.height === .24);
  for (const tusk of tusks) {
    const base = coneBase(tusk), tip = coneTip(tusk), localBase = jaw.worldToLocal(base.clone()), p = jaw.geometry.parameters;
    assert.ok(tip.y > base.y && tip.z < base.z, "tusk grows up and forward");
    assert.ok(Math.abs(localBase.x) < p.width / 2 && Math.abs(localBase.y) < p.height / 2 && Math.abs(localBase.z) < p.depth / 2,
      "tusk emerges from jaw");
  }
  const arms = actor.group.children.filter(object => object.children.length === 6
    && object.children.some(child => child.geometry?.type === "ConeGeometry"));
  assert.equal(arms.length, 2);
  for (const arm of arms) {
    const hand = arm.children.find(object => object.geometry.type === "SphereGeometry");
    for (const claw of arm.children.filter(object => object.geometry.type === "ConeGeometry")) {
      const base = coneBase(claw), tip = coneTip(claw), localBase = arm.worldToLocal(base.clone()), localTip = arm.worldToLocal(tip.clone());
      assert.ok(localTip.y < localBase.y && localTip.z < localBase.z, "claw hooks down and forward");
      const handBase = hand.worldToLocal(base);
      assert.ok(Math.hypot(handBase.x, handBase.y, handBase.z) < hand.geometry.parameters.radius, "claw base joins hand");
    }
  }
});


test("Briar moss is a rounded growth within the old back envelope and embedded in its torso", () => {
  const actor = model("createBriarBeastModel");
  const all = meshes(actor.group);
  const mantle = all.find(object => object.material.name === "briarLeaf");
  assert.equal(mantle.geometry.type, "SphereGeometry", "mantle has rounded geometry");
  const p = mantle.geometry.parameters;
  assert.ok(p.radius * mantle.scale.x * 2 <= .86 + 1e-9, "mantle retains back width");
  assert.ok(p.radius * mantle.scale.z * 2 <= 1.56 + 1e-9, "mantle retains back length");
  assert.ok(mantle.position.y + p.radius * mantle.scale.y <= 1.12 + 1e-9, "mantle retains back top height");
  const bodies = all.filter(object => object.parent === actor.group && object.geometry.type === "SphereGeometry"
    && object.material.name === "rootwood");
  for (const z of [-.5, .08, .6, .8]) {
    const normalizedZ = (z - mantle.position.z) / (p.radius * mantle.scale.z);
    const bottomY = mantle.position.y - p.radius * mantle.scale.y * Math.sqrt(1 - normalizedZ ** 2);
    const root = point(actor.group, 0, bottomY, z);
    assert.ok(bodies.some(body => {
      const local = body.worldToLocal(root.clone());
      return Math.hypot(local.x, local.y, local.z) < body.geometry.parameters.radius;
    }), "rounded moss grows into the existing torso rather than floating above it");
  }
  const spine = actor.group.children.find(object => object.children.length === 7);
  for (const spike of spine.children) assert.ok(coneTip(spike).y <= 1.35 * actor.group.scale.y,
    "rooting thorns does not increase the creature height");
});
