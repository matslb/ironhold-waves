import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Exercise the actual procedural builders without starting the browser's game
// loop. CHARACTER_MODELS_THREE_MODULE also checks the same contacts and sight
// lines against Three's real transforms, geometry and raycaster.
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
const THREE = process.env.CHARACTER_MODELS_THREE_MODULE
  ? await import(process.env.CHARACTER_MODELS_THREE_MODULE)
  : { Vector3, Group, Mesh, MeshStandardMaterial: Material, BoxGeometry, CylinderGeometry, ConeGeometry, SphereGeometry, TorusGeometry, RingGeometry, DoubleSide: 2 };
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
function fixture() {
  const material = name => { const m = new THREE.MeshStandardMaterial(); m.name = name; return m; };
  const materials = new Proxy({}, { get(target, name) { return target[name] ||= material(name); } });
  const geometries = new Map();
  const cachedPrimitiveGeometry = (name, values, factory) => {
    const key = `${name}:${values}`;
    if (!geometries.has(key)) geometries.set(key, factory());
    return geometries.get(key);
  };
  const mesh = (geometry, paint, x = 0, y = 0, z = 0) => {
    const result = new THREE.Mesh(geometry, paint); result.position.set(x, y, z); return result;
  };
  const context = {
    THREE, materials, cachedPrimitiveGeometry, addShadow: x => x,
    makeBox: (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z),
    makeCylinder: (a, b, h, n, m, x, y, z) => mesh(new THREE.CylinderGeometry(a, b, h, n), m, x, y, z),
    makeSphere: (r, m, x, y, z) => mesh(new THREE.SphereGeometry(r, 20, 14), m, x, y, z),
    makeCone: (r, h, n, m, x, y, z) => mesh(new THREE.ConeGeometry(r, h, n), m, x, y, z),
    player: { position: new THREE.Vector3() }, scene: new THREE.Group(),
    equippedWeapon: character => character, buildWeaponModel: () => new THREE.Group(),
    defaultWeaponByCharacter: { knight: "knight", wizard: "wizard", ranger: "ranger", sentinel: "sentinel" },
    SENTINEL_HALBERD_REST: { x: 1.08, y: 0, z: -0.08 }, TAU: Math.PI * 2,
    paletteMaterial: color => material(`palette:${color}`), paletteGlow: () => material("palette:glow"),
    modelScale: { npc: 1.32 }, explorationGroundWorldY: () => 2.75,
    npcBootMaterial: material("npcBoot"), npcApronMaterial: material("npcApron")
  };
  const build = name => new Function(...Object.keys(context), `${functionSource(name)}\nreturn ${name};`)(...Object.values(context));
  return { context, material, build };
}
const palette = { primary: "primary", cape: "cape", trim: "trim", glow: "glow", hat: "hat", robe: "robe" };
function hero(character, remote) {
  const f = fixture(), title = character[0].toUpperCase() + character.slice(1);
  if (!remote) { f.build(`create${title}`)(); return { ...f, refs: f.context.player, group: f.context.player.group }; }
  const group = new THREE.Group();
  return { ...f, group, refs: f.build(`createRemote${title}Details`)(group, palette) };
}
function meshes(root) { const result = []; root.traverse(o => { if (o.isMesh) result.push(o); }); return result; }
function point(object, x = 0, y = 0, z = 0) { return object.localToWorld(new THREE.Vector3(x, y, z)); }
function extents(geometry) {
  if (geometry.computeBoundingBox) { geometry.computeBoundingBox(); return geometry.boundingBox; }
  const p = geometry.parameters;
  let x = p.width / 2, y = p.height / 2, z = p.depth / 2;
  if (p.radiusTop !== undefined) x = z = Math.max(p.radiusTop, p.radiusBottom);
  if (geometry.type === "SphereGeometry") x = y = z = p.radius;
  if (geometry.type === "TorusGeometry") { x = y = p.radius + p.tube; z = p.tube; }
  return { min: new THREE.Vector3(-x, -y, -z), max: new THREE.Vector3(x, y, z) };
}
function bottom(mesh) {
  const b = extents(mesh.geometry), ys = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) ys.push(point(mesh, x, y, z).y);
  return Math.min(...ys);
}
function foot(leg) { return meshes(leg).sort((a, b) => bottom(a) - bottom(b))[0]; }
function close(a, b, label) { assert.ok(Math.abs(a - b) < 1e-6, `${label}: ${a} vs ${b}`); }

// Offline line-of-sight checks intersect analytic shells. The optional actual
// Three run uses triangle raycasts, covering tessellation and material sides.
function intersectsSegment(object, origin, target) {
  const a = object.worldToLocal(origin.clone()), b = object.worldToLocal(target.clone());
  const d = b.clone().sub(a), p = object.geometry.parameters, tau = Math.PI * 2;
  const inArc = (angle, start, length) => length >= tau - 1e-9 || ((angle - start) % tau + tau) % tau <= length + 1e-9;
  if (object.geometry.type === "SphereGeometry") {
    const aa = d.x ** 2 + d.y ** 2 + d.z ** 2, bb = 2 * (a.x * d.x + a.y * d.y + a.z * d.z);
    const cc = a.x ** 2 + a.y ** 2 + a.z ** 2 - p.radius ** 2, disc = bb ** 2 - 4 * aa * cc;
    if (disc < 0 || aa === 0) return false;
    return [(-bb - Math.sqrt(disc)) / (2 * aa), (-bb + Math.sqrt(disc)) / (2 * aa)].some(t => {
      if (t < 0 || t > 1) return false;
      const x = a.x + d.x * t, y = a.y + d.y * t, z = a.z + d.z * t;
      const theta = Math.acos(Math.max(-1, Math.min(1, y / p.radius)));
      return inArc(Math.atan2(z, -x), p.phiStart, p.phiLength) && theta >= p.thetaStart && theta <= p.thetaStart + p.thetaLength;
    });
  }
  if (object.geometry.type === "TorusGeometry") {
    assert.ok(Math.abs(d.x) + Math.abs(d.y) < 1e-8, "fixture ray crosses the cloth/rim plane normally");
    const radial = Math.hypot(a.x, a.y), cross = p.tube ** 2 - (radial - p.radius) ** 2;
    if (cross < 0 || !inArc(Math.atan2(a.y, a.x), 0, p.arc)) return false;
    return [-Math.sqrt(cross), Math.sqrt(cross)].some(z => { const t = (z - a.z) / d.z; return t >= 0 && t <= 1; });
  }
  const bounds = extents(object.geometry);
  let enter = 0, leave = 1;
  for (const axis of ["x", "y", "z"]) {
    if (Math.abs(d[axis]) < 1e-12) { if (a[axis] < bounds.min[axis] || a[axis] > bounds.max[axis]) return false; continue; }
    const low = (bounds.min[axis] - a[axis]) / d[axis], high = (bounds.max[axis] - a[axis]) / d[axis];
    enter = Math.max(enter, Math.min(low, high)); leave = Math.min(leave, Math.max(low, high));
    if (enter > leave) return false;
  }
  return true;
}
function blocked(root, occluders, origin, target) {
  root.updateMatrixWorld(true);
  if (!THREE.Raycaster) return occluders.some(o => intersectsSegment(o, origin, target));
  const ray = new THREE.Raycaster(origin, target.clone().sub(origin).normalize(), 0, origin.distanceTo(target));
  return ray.intersectObjects(occluders, false).length > 0;
}
function checkFace(root, head, occluders, samples) {
  const radius = head.geometry.parameters.radius;
  for (const [x, y] of samples) {
    const z = -Math.sqrt(radius ** 2 - x ** 2 - y ** 2);
    const target = point(head, x, y, z - 0.002), origin = point(head, x, y, -1);
    assert.equal(blocked(root, occluders, origin, target), false, `face at ${x}, ${y} is clear of cloth/hair`);
  }
}

for (const character of ["knight", "wizard", "ranger", "sentinel"]) for (const remote of [false, true]) {
  test(`${remote ? "remote" : "local"} ${character} boots meet the ground and remain on the moving legs`, () => {
    const f = hero(character, remote);
    for (const leg of [f.refs.leftLeg, f.refs.rightLeg]) {
      const boot = foot(leg); assert.ok(boot, "leg owns its complete foot");
      close(bottom(boot), f.group.position.y, "rest foot contact");
      const before = point(boot); leg.rotation.x = 0.45;
      assert.ok(point(boot).distanceTo(before) > 0.1, "boot follows walk/riding hip rotation");
    }
  });
}

for (const remote of [false, true]) {
  test(`${remote ? "remote" : "local"} ranger keeps hands/bracers attached and hood clear of the face`, () => {
    const f = hero("ranger", remote);
    for (const arm of [f.refs.leftArm, f.refs.rightArm]) {
      const rig = arm.userData.gripRig; assert.ok(rig?.hand && rig?.cuff, "complete animated hand and bracer");
      const hand = point(rig.hand), cuff = point(rig.cuff); arm.rotation.x = -0.8;
      assert.ok(point(rig.hand).distanceTo(hand) > 0.1, "hand follows casting shoulder rotation");
      assert.ok(point(rig.cuff).distanceTo(cuff) > 0.1, "bracer follows casting shoulder rotation");
    }
    const all = meshes(f.group);
    const head = all.find(m => m.material.name === "skin" && m.geometry.parameters.radius > 0.2);
    const cloth = all.filter(m => ["rangerHood", "palette:hat"].includes(m.material.name));
    assert.ok(head && cloth.length, "face and hood exist");
    checkFace(f.group, head, cloth, [[-.08, .03], [.08, .03], [-.12, -.03], [.12, -.03], [0, -.1]]);
  });
  test(`${remote ? "remote" : "local"} knight shield rim surrounds the face without filling its center`, () => {
    const f = hero("knight", remote);
    const rim = meshes(f.refs.shieldPivot).find(m => m.geometry.type === "TorusGeometry");
    assert.ok(rim, "shield has an open rim");
    assert.equal(blocked(f.group, [rim], point(rim, 0, 0, -1), point(rim, 0, 0, 1)), false, "rim center remains open");
    const radius = rim.geometry.parameters.radius;
    assert.equal(blocked(f.group, [rim], point(rim, radius, 0, -1), point(rim, radius, 0, 1)), true, "rim edge encloses the shield face");
  });
}

test("friendly NPC footwear stays grounded and every hair/hood style leaves eyes and cheeks visible", () => {
  for (const biome of ["meadow", "mountain", "desert", "city", "swamp", "briar"]) {
    for (const headwear of ["none", "hood", "hat"]) for (const hairStyle of ["short", "long", "bun", "bald"]) {
      const f = fixture();
      const look = { garment: f.material("npcGarment"), leg: f.material("npcLeg"), skin: f.context.materials.skin,
        hair: f.material("npcHair"), trim: f.material("npcTrim"), girth: 1.18, headwear, hairStyle, beard: true, apron: true };
      f.context.npcAppearance = () => look;
      const npc = f.build("createFriendlyNpc")(11, -8, () => .5, 5.5, "Test villager", null, biome);
      for (const leg of [npc.leftLeg, npc.rightLeg]) close(bottom(foot(leg)), 2.75, `${biome}/${headwear}/${hairStyle} foot contact`);
      const occluders = meshes(npc.group).filter(m => m.material !== look.skin && m.material !== f.context.materials.charcoal && m.visible);
      checkFace(npc.group, npc.head, occluders, [[-.07, .02], [.07, .02], [-.08, -.02], [.08, -.02]]);
    }
  }
});
