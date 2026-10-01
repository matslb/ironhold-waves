import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Instantiate the bounded runtime factories without booting the game DOM.
// HUMANOID_MODELS_THREE_MODULE enables geometry/raycast checks in real Three.
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  setScalar(v) { return this.set(v, v, v); }
}
class Group {
  constructor() { this.position = new Vector3(); this.scale = new Vector3(1, 1, 1); this.rotation = new Vector3(); this.children = []; this.userData = {}; }
  add(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
}
class Material {
  constructor() { this.userData = {}; }
  clone() { const copy = Object.assign(new Material(), this); copy.userData = { ...this.userData }; return copy; }
}
class Mesh extends Group {
  constructor(geometry, material) { super(); Object.assign(this, { geometry, material, isMesh: true }); }
}
class BoxGeometry { constructor(width, height, depth) { this.type = "BoxGeometry"; this.parameters = { width, height, depth }; } }
class CylinderGeometry { constructor(radiusTop, radiusBottom, height) { this.type = "CylinderGeometry"; this.parameters = { radiusTop, radiusBottom, height }; } }
class SphereGeometry {
  constructor(radius, widthSegments, heightSegments, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI) {
    this.type = "SphereGeometry"; this.parameters = { radius, phiStart, phiLength, thetaStart, thetaLength };
  }
}
class Geometry { constructor() { this.parameters = {}; } }
class PointLight extends Group { constructor(color, intensity, distance) { super(); Object.assign(this, { color, intensity, distance }); } }
const THREE = process.env.HUMANOID_MODELS_THREE_MODULE
  ? await import(process.env.HUMANOID_MODELS_THREE_MODULE)
  : { Vector3, Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry, PlaneGeometry: Geometry, RingGeometry: Geometry, TorusGeometry: Geometry, PointLight, MeshBasicMaterial: Material, DoubleSide: 2 };
const runtime = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

function factory(name) {
  const start = runtime.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const end = runtime.indexOf("\n  function ", start + 1);
  const source = runtime.slice(start, end);
  const materialCache = new Map();
  const materials = new Proxy({}, { get(_, name) {
    if (!materialCache.has(name)) {
      const material = THREE.MeshStandardMaterial ? new THREE.MeshStandardMaterial() : new Material();
      if (name === "wisp" || name === "wispCore") { material.transparent = true; material.opacity = name === "wisp" ? 0.48 : 0.94; material.depthWrite = name === "wispCore"; }
      material.userData.kind = name; materialCache.set(name, material);
    }
    return materialCache.get(name);
  } });
  const geometryCache = new Map();
  function mesh(geometry, material, x, y, z) {
    const result = new THREE.Mesh(geometry, material); result.position.set(x, y, z); return result;
  }
  const makeBox = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const makeCylinder = (a, b, h, segments, mat, x, y, z) => mesh(new THREE.CylinderGeometry(a, b, h, segments), mat, x, y, z);
  const makeSphere = (r, mat, x, y, z) => mesh(new THREE.SphereGeometry(r, 12, 8), mat, x, y, z);
  const makeCone = (r, h, segments, mat, x, y, z) => makeCylinder(0, r, h, segments, mat, x, y, z);
  const cachedPrimitiveGeometry = (key, args, create) => {
    if (!geometryCache.has(key)) geometryCache.set(key, create());
    return geometryCache.get(key);
  };
  const makeCreatureHealthBar = () => ({ healthRoot: new THREE.Group(), hpFill: new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial()) });
  const create = new Function("THREE", "materials", "makeBox", "makeCylinder", "makeSphere", "makeCone", "cachedPrimitiveGeometry", "addShadow", "makeCreatureHealthBar", `${source}\nreturn ${name};`)(
    THREE, materials, makeBox, makeCylinder, makeSphere, makeCone, cachedPrimitiveGeometry, object => object, makeCreatureHealthBar
  );
  return { create, materials };
}
function minLegY(leg, scale) {
  if (THREE.Box3) return new THREE.Box3().setFromObject(leg).min.y;
  return scale * Math.min(...leg.children.map(child => leg.position.y + child.position.y - child.geometry.parameters.height * child.scale.y / 2));
}
function find(model, geometryType, predicate) {
  return model.group.children.find(child => child.geometry?.type === geometryType && predicate(child.geometry.parameters, child));
}

test("neutral humanoid feet meet the actor ground plane at small and large model scales", () => {
  for (const name of ["createBarbarianModel", "createBanditArcherModel", "createBonewardenModel"]) {
    const { create } = factory(name);
    for (const scale of [0.85, 1.8]) {
      const model = create(scale);
      for (const leg of [model.leftLeg, model.rightLeg]) assert.ok(Math.abs(minLegY(leg, scale)) < 1e-6, `${name} leg floor at scale ${scale}`);
    }
  }
});

test("barbarian axe spike has its broad base inside the axe and its narrow end above it", () => {
  const model = factory("createBarbarianModel").create(1);
  const spike = model.weaponPivot.children.find(child => child.geometry?.parameters.radiusTop === 0.025);
  assert.ok(spike.geometry.parameters.radiusTop < spike.geometry.parameters.radiusBottom);
  assert.equal(spike.rotation.z, 0);
  const lower = spike.position.y - spike.geometry.parameters.height / 2;
  const upper = spike.position.y + spike.geometry.parameters.height / 2;
  const axe = model.weaponPivot.children.find(child => child.geometry?.parameters.width === 0.56);
  const axeTop = axe.position.y + axe.geometry.parameters.height / 2;
  assert.ok(lower < axeTop && upper > axeTop);
});

test("bonewarden neck bridges the spine and skull rather than leaving a floating head", () => {
  const model = factory("createBonewardenModel").create(1);
  const spine = find(model, "CylinderGeometry", p => p.height === 0.52);
  const neck = find(model, "CylinderGeometry", p => p.height === 0.25);
  const skull = find(model, "SphereGeometry", p => p.radius === 0.2);
  assert.ok(neck.position.y - neck.geometry.parameters.height / 2 <= spine.position.y + spine.geometry.parameters.height / 2);
  assert.ok(neck.position.y + neck.geometry.parameters.height / 2 >= skull.position.y - skull.geometry.parameters.radius * skull.scale.y);
});

test("bandit hood exposes both eyes, reuses immutable geometry, and keeps the game-wide material unchanged", () => {
  const { create, materials } = factory("createBanditArcherModel");
  const first = create(1); const second = create(1);
  const hood = find(first, "SphereGeometry", p => p.radius === 0.27);
  const nextHood = find(second, "SphereGeometry", p => p.radius === 0.27);
  assert.equal(hood.geometry, nextHood.geometry);
  assert.notEqual(hood.material, materials.banditHood);
  assert.notEqual(materials.banditHood.side, THREE.DoubleSide);
  for (const eye of first.group.children.filter(child => child.geometry?.type === "SphereGeometry" && child.geometry.parameters.radius === 0.028)) {
    if (THREE.Raycaster) {
      first.group.updateWorldMatrix(true, true);
      const ray = new THREE.Raycaster(new THREE.Vector3(eye.position.x, eye.position.y, -1), new THREE.Vector3(0, 0, 1), 0, 1 + eye.position.z);
      assert.equal(ray.intersectObject(hood).length, 0, "front ray reaches eye without hitting hood");
    } else {
      const angle = (Math.atan2((eye.position.z - hood.position.z) / hood.scale.z, -(eye.position.x - hood.position.x) / hood.scale.x) + Math.PI * 2) % (Math.PI * 2);
      const covered = (angle - hood.geometry.parameters.phiStart + Math.PI * 2) % (Math.PI * 2);
      assert.ok(covered > hood.geometry.parameters.phiLength, "eye lies in shell aperture");
    }
  }
});

test("bandit hands stay children of the animated arms and meet their matching skin forearms", () => {
  const model = factory("createBanditArcherModel").create(1);
  for (const arm of [model.bowArmL, model.bowArmR]) {
    const hand = arm.children.find(child => child.geometry?.type === "SphereGeometry");
    const forearm = arm.children.find(child => child.geometry?.parameters.radiusTop === 0.055);
    assert.ok(hand, "arm has a hand"); assert.equal(hand.parent, arm);
    assert.equal(hand.material.userData.kind, forearm.material.userData.kind);
    assert.ok(Math.abs(hand.position.y - (forearm.position.y - forearm.geometry.parameters.height / 2)) <= hand.geometry.parameters.radius);
  }
});

test("viper eyes project ahead of the opaque head and downward fangs remain rooted in the snout", () => {
  const model = factory("createSandViperModel").create(1);
  const head = model.neckPivot.children.find(child => child.geometry?.type === "SphereGeometry" && child.geometry.parameters.radius === 0.18);
  const snout = model.neckPivot.children.find(child => child.geometry?.type === "BoxGeometry" && child.geometry.parameters.width === 0.16);
  const eyes = model.neckPivot.children.filter(child => child.geometry?.type === "SphereGeometry" && child.geometry.parameters.radius === 0.035);
  assert.equal(eyes.length, 2);
  for (const eye of eyes) {
    const rx = head.geometry.parameters.radius * head.scale.x, ry = head.geometry.parameters.radius * head.scale.y, rz = head.geometry.parameters.radius * head.scale.z;
    const ellipse = ((eye.position.x - head.position.x) / rx) ** 2 + ((eye.position.y - head.position.y) / ry) ** 2;
    const front = head.position.z - rz * Math.sqrt(1 - ellipse);
    assert.ok(eye.position.z < front, "eye center lies on exposed head surface");
    assert.ok(eye.position.z + eye.geometry.parameters.radius > front, "eye remains attached to the head");
    if (THREE.Raycaster) {
      // Check the actual faceted geometry in neck-local space before its pose.
      model.neckPivot.rotation.x = 0; model.neckPivot.position.set(0, 0, 0); model.group.updateWorldMatrix(true, true);
      const ray = new THREE.Raycaster(new THREE.Vector3(eye.position.x, eye.position.y, -1), new THREE.Vector3(0, 0, 1));
      assert.equal(ray.intersectObjects([eye, head, snout])[0].object, eye);
    }
  }
  const fangs = model.neckPivot.children.filter(child => child.geometry?.parameters.height === 0.1 && child.geometry.parameters.radiusTop === 0);
  assert.equal(fangs.length, 2);
  for (const fang of fangs) {
    assert.equal(fang.rotation.x, Math.PI);
    const baseY = fang.position.y + fang.geometry.parameters.height / 2;
    assert.ok(baseY >= snout.position.y - snout.geometry.parameters.height / 2 && baseY <= snout.position.y + snout.geometry.parameters.height / 2);
    assert.equal(fang.parent, model.neckPivot);
  }
});

test("viper beads remain grounded and joined throughout maximum-speed slither and the original tail follows the rear bead", () => {
  const model = factory("createSandViperModel").create(1);
  for (const bead of model.segments) assert.ok(Math.abs(bead.position.y - bead.geometry.parameters.radius * bead.scale.y) < 1e-9);
  // A shared point on the center-to-center line is a sufficient solid overlap
  // test for the two ellipsoids, even with the longer tapered rear bead.
  for (let sample = 0; sample < 360; sample++) {
    const time = sample * Math.PI * 2 / 360;
    for (let index = 1; index < model.segments.length; index++) {
      const a = model.segments[index - 1], b = model.segments[index];
      const ax = Math.sin(time - (index - 1) * 0.6) * (0.16 + (index - 1) * 0.02) * 1.4;
      const bx = Math.sin(time - index * 0.6) * (0.16 + index * 0.02) * 1.4;
      const dx = bx - ax, dy = b.position.y - a.position.y, dz = b.position.z - a.position.z;
      const distance = Math.hypot(dx, dy, dz);
      function radial(bead) {
        const r = bead.geometry.parameters.radius;
        return distance / Math.sqrt((dx / (r * bead.scale.x)) ** 2 + (dy / (r * bead.scale.y)) ** 2 + (dz / (r * bead.scale.z)) ** 2);
      }
      assert.ok(radial(a) + radial(b) >= distance, `beads ${index - 1}/${index} overlap at ${sample}`);
    }
  }
  const rear = model.segments[0];
  const tailRoot = rear.children.find(child => !child.geometry);
  const tail = tailRoot.children[0];
  assert.equal(tailRoot.parent, rear); assert.equal(tail.rotation.x, Math.PI / 2);
  assert.equal(tail.geometry.parameters.height, 0.5); assert.equal(tail.geometry.parameters.radiusBottom, 0.08);
  assert.ok(Math.abs(rear.position.y + tailRoot.position.y * rear.scale.y - 0.1) < 1e-9);
  assert.ok(Math.abs(rear.position.z + tailRoot.position.z * rear.scale.z - 1.9) < 1e-9);
  assert.ok(Math.abs(tailRoot.scale.y * rear.scale.y - 1) < 1e-9);
  assert.ok(Math.abs(tailRoot.scale.z * rear.scale.z - 1) < 1e-9);
  if (THREE.Box3) {
    rear.position.x = 0.224;
    const point = tail.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(point.x - 0.224) < 1e-9);
  }
});

test("wisp keeps intentional hover and every animated light/mote remains attached to its float root", () => {
  const { create, materials } = factory("createWispModel");
  const model = create(1.8);
  for (const part of [model.shell, model.core, model.ringA, model.ringB, model.ringC, ...model.sparks, ...model.trail, ...model.embers]) assert.equal(part.parent, model.floatRoot);
  const outer = model.floatRoot.children.find(child => child.geometry?.parameters.radius === 0.58);
  assert.ok((0.98 - 0.16 - outer.geometry.parameters.radius * outer.scale.y) * 1.8 > 0, "lowest normal bob still hovers");
  assert.equal(outer.material.depthWrite, false);
  assert.equal(materials.wisp.opacity, 0.48);
  assert.notEqual(outer.material, materials.wisp);
  assert.equal(model.floatRoot.parent, model.group);
});
