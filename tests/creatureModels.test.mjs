import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Geometry/animation checks need Three's actual vertices and transforms. The
// browser loads Three from a CDN; point this at that module for full model QA.
const modulePath = process.env.CREATURE_MODELS_THREE_MODULE || process.env.CHARACTER_MODELS_THREE_MODULE;
const THREE = modulePath ? await import(modulePath) : null;
const source = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
const options = { skip: !THREE && "Set CREATURE_MODELS_THREE_MODULE to the browser's Three module" };

function fixture() {
  const materials = new Proxy({}, { get(target, name) {
    if (!target[name]) { const material = new THREE.MeshStandardMaterial(); material.name = name; target[name] = material; }
    return target[name];
  } });
  materials.dragonWing.side = THREE.DoubleSide;
  const geometries = new Map();
  const cachedPrimitiveGeometry = (name, values, factory) => {
    const key = `${name}:${values}`;
    if (!geometries.has(key)) geometries.set(key, factory());
    return geometries.get(key);
  };
  const mesh = (geometry, material, x = 0, y = 0, z = 0) => {
    const result = new THREE.Mesh(geometry, material); result.position.set(x, y, z); return result;
  };
  const context = {
    THREE, materials, cachedPrimitiveGeometry, addShadow: x => x,
    makeBox: (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z),
    makeCylinder: (a, b, h, n, m, x, y, z) => mesh(new THREE.CylinderGeometry(a, b, h, n), m, x, y, z),
    makeSphere: (r, m, x, y, z) => mesh(new THREE.SphereGeometry(r, 20, 14), m, x, y, z),
    makeCone: (r, h, n, m, x, y, z) => mesh(new THREE.ConeGeometry(r, h, n), m, x, y, z),
    tmpVec: new THREE.Vector3(), lerp: (a, b, t) => a + (b - a) * t,
    clamp: (v, low, high) => Math.max(low, Math.min(high, v))
  };
  const build = name => {
    const start = source.indexOf(`  function ${name}(`);
    assert.ok(start >= 0, `${name} exists`);
    const end = source.indexOf("\n  function ", start + 1);
    return new Function(...Object.keys(context), `${source.slice(start, end)}\nreturn ${name};`)(...Object.values(context));
  };
  context.makeWing = build("makeWing");
  return { context, build };
}
function point(object, x = 0, y = 0, z = 0) { return object.localToWorld(new THREE.Vector3(x, y, z)); }
function close(a, b, label) { assert.ok(a.distanceTo(b) < 1e-6, `${label}: ${a.toArray()} vs ${b.toArray()}`); }
function meshes(root) { const result = []; root.traverse(o => { if (o.isMesh) result.push(o); }); return result; }
function firstFaceHit(group, object) {
  group.updateMatrixWorld(true);
  const target = point(object), origin = target.clone().add(new THREE.Vector3(0, 0, -3));
  const ray = new THREE.Raycaster(origin, new THREE.Vector3(0, 0, 1), 0, 3.1);
  return ray.intersectObjects(meshes(group).filter(m => m.visible && !m.material.transparent), false)[0]?.object;
}

// Closed convex primitives let their actual triangles define a volume. This
// catches visible gaps even when loose world bounding boxes still overlap.
function convexPlanes(mesh) {
  mesh.updateWorldMatrix(true, false);
  const geometry = mesh.geometry, attribute = geometry.attributes.position;
  const vertices = Array.from({ length: attribute.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(attribute, i).applyMatrix4(mesh.matrixWorld));
  const planes = [], index = geometry.index;
  for (let i = 0; i < (index ? index.count : attribute.count); i += 3) {
    const a = vertices[index ? index.getX(i) : i], b = vertices[index ? index.getX(i + 1) : i + 1], c = vertices[index ? index.getX(i + 2) : i + 2];
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    if (normal.lengthSq() < 1e-16) continue;
    normal.normalize(); planes.push({ normal, offset: -normal.dot(a) });
  }
  return planes;
}
function clearance(planes, point) { return -Math.max(...planes.map(p => p.normal.dot(point) + p.offset)); }

test("dragon neck volumes overlap body/head and every dorsal/tail spike root is embedded in skin", options, t => {
  const f = fixture(), model = f.build("createDragonModel")(1.06);
  const all = meshes(model.group), skin = all.filter(m => ["dragonScale", "dragonBelly"].includes(m.material.name));
  const planes = new Map(skin.map(m => [m, convexPlanes(m)]));
  const necks = skin.filter(m => m.geometry.type === "CylinderGeometry" && m.position.z < -.7).sort((a, b) => b.position.z - a.position.z);
  const head = skin.find(m => m.geometry.type === "SphereGeometry");
  const chain = [model.body, ...necks, head];
  const overlaps = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const a = chain[i], b = chain[i + 1];
    const axes = [a, b].map(m => {
      const h = m.geometry.parameters.height || 0;
      return [-.5, -.25, 0, .25, .5].map(fraction => point(m, 0, fraction * h));
    });
    const candidates = [...axes.flat(), ...axes[0].flatMap(pa => axes[1].map(pb => pa.clone().add(pb).multiplyScalar(.5)))];
    const overlap = candidates.filter(p => clearance(planes.get(a), p) >= -1e-6 && clearance(planes.get(b), p) >= -1e-6);
    assert.ok(overlap.length > 0, `neck connection ${i} has real volume overlap`);
    const interior = Math.max(...overlap.map(p => Math.min(clearance(planes.get(a), p), clearance(planes.get(b), p))));
    assert.ok(interior > 1e-4, "adjoining segments share interior volume rather than barely touching");
    overlaps.push(interior);
  }
  const spikes = all.filter(m => m.geometry.type === "CylinderGeometry" && m.material.name === "bone" && m.geometry.parameters.height <= .3);
  assert.equal(spikes.length, 13, "dorsal and segmented-tail spikes are present");
  const insertions = spikes.map(spike => {
    const root = point(spike, 0, -spike.geometry.parameters.height / 2);
    const depth = Math.max(...skin.map(m => clearance(planes.get(m), root)));
    assert.ok(depth >= -1e-6, "spike base joins a body/head/tail surface");
    return depth;
  });
  t.diagnostic(`Joint common interior clearances: ${overlaps.map(v => v.toFixed(3)).join(", ")}u; shallowest spike insertion: ${Math.min(...insertions).toFixed(3)}u`);
});

test("dragon neck and tail taper toward their connected head and tail tip", options, () => {
  const f = fixture(), model = f.build("createDragonModel")(1.06);
  const all = meshes(model.group);
  const necks = all.filter(m => m.geometry.type === "CylinderGeometry" && m.material.name === "dragonScale" && m.position.z < -0.7);
  assert.equal(necks.length, 3);
  for (const neck of necks) {
    const height = neck.geometry.parameters.height;
    const top = point(neck, 0, height / 2), base = point(neck, 0, -height / 2);
    assert.ok(top.z < base.z && top.y > base.y, "neck rises forward toward the head");
  }
  const tailTip = all.find(m => m.geometry.type === "ConeGeometry" && m.position.z > 2);
  const endSegment = all.filter(m => m.geometry.type === "CylinderGeometry" && m.material.name === "dragonScale" && m.position.z > 1).sort((a, b) => b.position.z - a.position.z)[0];
  const apex = point(tailTip, 0, tailTip.geometry.parameters.height / 2);
  const base = point(tailTip, 0, -tailTip.geometry.parameters.height / 2);
  assert.ok(apex.z > base.z, "tail point faces away from the body");
  assert.ok(base.distanceTo(point(endSegment, 0, endSegment.geometry.parameters.height / 2)) < .15, "tip joins the last tapered segment");
});

test("dragon jaw opens down from a fixed throat hinge; facial details remain exposed", options, () => {
  const f = fixture(), model = f.build("createDragonModel")(1.06);
  const hinge = point(model.lowerJaw), lip = point(model.lowerJaw, 0, 0, -.48);
  const enemy = { ...model, velocity: new THREE.Vector3(), speed: 5, state: "fire", attackTimer: .5, attackDuration: 1, wingTime: 0 };
  f.build("updateDragonAnimation")(enemy, .34);
  close(point(model.lowerJaw), hinge, "throat hinge stays attached");
  assert.ok(point(model.lowerJaw, 0, 0, -.48).y < lip.y - .15, "lower lip drops during fire windup");
  for (const detail of meshes(model.group).filter(m => ["dragonEye", "charcoal"].includes(m.material.name))) {
    assert.ok(firstFaceHit(model.group, detail) === detail, `${detail.material.name} is visible in front of the head/jaws`);
  }
  const horns = meshes(model.group).filter(m => m.geometry.type === "CylinderGeometry" && m.material.name === "bone" && m.position.y > .9 && m.position.z < -1 && m.geometry.parameters.height > .5);
  assert.equal(horns.length, 2);
  for (const horn of horns) {
    const tip = point(horn, 0, horn.geometry.parameters.height / 2), base = point(horn, 0, -horn.geometry.parameters.height / 2);
    assert.ok(tip.y > base.y && Math.abs(tip.x) > Math.abs(base.x), "horns point up and outward");
  }
});

test("dragon wing ribs attach at the shoulder and meet the membrane vertices on both sides", options, () => {
  const f = fixture(), model = f.build("createDragonModel")(1.06);
  for (const hinge of [model.leftWing, model.rightWing]) {
    const wing = hinge.children[0], all = meshes(wing);
    const membrane = all.find(m => m.geometry.type === "BufferGeometry");
    const positions = membrane.geometry.attributes.position;
    const vertices = Array.from({ length: positions.count }, (_, i) => point(membrane, positions.getX(i), positions.getY(i), positions.getZ(i)));
    const root = vertices[0];
    for (const rib of all.filter(m => m.geometry.type === "CylinderGeometry")) {
      const half = rib.geometry.parameters.height / 2;
      close(point(rib, 0, -half), root, "rib rooted at shoulder");
      assert.ok(vertices.slice(1).some(v => v.distanceTo(point(rib, 0, half)) < 1e-6), "finger meets the membrane edge");
    }
  }
});

test("spider feet meet the ground and all upper/lower joints stay connected through a full gait", options, () => {
  const f = fixture(), model = f.build("createSpiderModel")(1.32);
  const animate = f.build("updateSpiderAnimation");
  const enemy = { ...model, velocity: new THREE.Vector3(), speed: 3, walkTime: 0, stunned: 0 };
  assert.equal(model.legs.length, 16, "paired limb contract is preserved");
  const checkJoints = () => {
    model.group.updateMatrixWorld(true);
    for (let i = 0; i < model.legs.length; i += 2) {
      const hip = model.legs[i], rig = hip.userData.spiderRig;
      assert.equal(model.legs[i + 1].parent, hip, "knee follows its hip");
      const upperHalf = rig.upper.geometry.parameters.height / 2, lowerHalf = rig.shin.geometry.parameters.height / 2;
      close(point(rig.upper, 0, -upperHalf), point(hip), "upper starts at body socket");
      close(point(rig.upper, 0, upperHalf), point(rig.knee), "upper meets knee");
      close(point(rig.shin, 0, lowerHalf), point(rig.knee), "shin meets knee");
      close(point(rig.shin, 0, -lowerHalf), point(rig.foot), "shin meets toe");
      assert.ok(new THREE.Box3().setFromObject(rig.foot).min.y >= -1e-6, "toe stays above the terrain");
    }
  };
  checkJoints();
  for (let i = 0; i < model.legs.length; i += 2) {
    assert.ok(Math.abs(new THREE.Box3().setFromObject(model.legs[i].userData.spiderRig.foot).min.y) < 1e-6, "rest toe touches terrain");
  }
  enemy.velocity.z = 3;
  for (let frame = 0; frame < 120; frame++) { animate(enemy, 1 / 60); checkJoints(); }
  enemy.velocity.set(0, 0, 0); animate(enemy, 1 / 60);
  model.group.updateMatrixWorld(true);
  for (let i = 0; i < model.legs.length; i += 2) assert.ok(Math.abs(new THREE.Box3().setFromObject(model.legs[i].userData.spiderRig.foot).min.y) < 1e-6, "idle toe settles to terrain");
  for (const eye of meshes(model.group).filter(m => m.material.name === "emberEye")) assert.ok(firstFaceHit(model.group, eye) === eye, "spider eyes clear the carapace");
});
