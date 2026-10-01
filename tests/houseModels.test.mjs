import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Exercise the real procedural builders without loading the browser runtime.
// Geometry doubles retain dimensions/transforms for contact and clearance checks.
const source = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
class Vector {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  setScalar(value) { return this.set(value, value, value); }
}
class Group {
  constructor() { this.children = []; this.position = new Vector(); this.rotation = new Vector(); this.scale = new Vector(1, 1, 1); }
  add(...parts) { this.children.push(...parts); return this; }
}
const materials = new Proxy({}, { get(target, key) {
  return target[key] ||= { id: key, clone() { return { ...this, color: { setHex() {} } }; } };
} });
const primitive = (kind, dimensions, material, x, y, z) => Object.assign(new Group(), {
  kind, dimensions, material, position: new Vector(x, y, z)
});
const colliders = [];
const context = vm.createContext({
  THREE: { Group }, Math, materials,
  meadowHouse: { timber: materials.wood, foundation: materials.stone, planter: materials.wood, leaf: materials.leaf },
  meadowHouseStyles: [{ wall: materials.adobe, roof: materials.roof, bloom: materials.bloom, porch: true },
    { wall: materials.adobe, roof: materials.roof, bloom: materials.bloom, porch: false }],
  setExplorationLocalGroundPosition(object, x, z) { object.position.set(x, 0, z); },
  addExplorationCollider(...args) { colliders.push(args); },
  makeBox(w, h, d, material, x, y, z) { return primitive("box", [w, h, d], material, x, y, z); },
  makeGable(w, h, d, material, x, y, z) { return primitive("gable", [w, h, d], material, x, y, z); },
  makeCylinder(rt, rb, h, segments, material, x, y, z) { return primitive("cylinder", [rt, rb, h], material, x, y, z); },
  makeCone(r, h, segments, material, x, y, z) { return primitive("cone", [r, h, segments], material, x, y, z); },
  makeSphere(r, material, x, y, z) { return primitive("sphere", [r], material, x, y, z); }
});
for (const name of ["makeHouseShell", "makePitchedHouseRoof", "addStable", "addDesertHouse", "addMountainHouse",
  "addSwampHouse", "addBriarHouse", "addMeadowHouse", "addCityHouse"]) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `builder ${name} exists`);
  const next = source.indexOf("\n  function ", start + 1);
  vm.runInContext(source.slice(start, next < 0 ? undefined : next), context);
}
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} vs ${expected}`);

for (const dimensions of [
  { width: 6.05, depth: 5.2, wallWidth: 5, wallDepth: 4.4, wallTop: 2.96, rise: 1.15, thickness: 0.3 },
  { width: 5.9, depth: 5.4, wallWidth: 5.2, wallDepth: 4.6, wallTop: 3.22, rise: 1.15, thickness: 0.22 },
  { width: 5.45, depth: 4.86, wallWidth: 4.6, wallDepth: 4, wallTop: 2.98, rise: 1.05, thickness: 0.26 }
]) {
  test(`pitched roof ${dimensions.wallWidth} x ${dimensions.wallDepth} seals wall, ridge and side gables`, () => {
    const roof = context.makePitchedHouseRoof({ ...dimensions, roofMaterial: materials.roof, wallMaterial: materials.stone });
    const panels = roof.children.filter(mesh => mesh.material === materials.roof);
    const gables = roof.children.filter(mesh => mesh.kind === "gable");
    assert.equal(panels.length, 2); assert.equal(gables.length, 2);
    for (const panel of panels) {
      const undersideAt = z => panel.position.y - Math.tan(panel.rotation.x) * (z - panel.position.z)
        - dimensions.thickness / (2 * Math.cos(panel.rotation.x));
      const sign = Math.sign(panel.position.z);
      close(undersideAt(sign * dimensions.wallDepth / 2), dimensions.wallTop, "roof touches wall top");
      close(undersideAt(0), dimensions.wallTop + dimensions.rise, "both slopes meet at ridge");
      const projectedHalfLength = panel.dimensions[2] * Math.cos(panel.rotation.x) / 2;
      close(panel.position.z - sign * projectedHalfLength, 0, "slope ends at ridge without overrun");
      assert.ok(undersideAt(sign * dimensions.depth / 2) < dimensions.wallTop, "eaves slope outward/down");
    }
    for (const gable of gables) {
      close(gable.rotation.y, Math.PI / 2, "gable faces side wall along roof ridge");
      close(Math.abs(gable.position.x) + gable.dimensions[2] / 2, dimensions.wallWidth / 2, "gable meets side wall");
      close(gable.position.z, 0, "gable spans building depth");
      close(gable.dimensions[0], dimensions.wallDepth, "gable width matches wall depth");
      close(gable.dimensions[1], dimensions.rise, "gable reaches ridge");
    }
  });
}

test("house doors clear the adult hero and match their closed wall openings", () => {
  const builders = ["addDesertHouse", "addMountainHouse", "addSwampHouse", "addBriarHouse", "addMeadowHouse", "addCityHouse"];
  const expectedRadii = [3.35, 3.35, 3.45, 3.45, 3.4, 3.05];
  for (let i = 0; i < builders.length; i++) {
    const root = new Group();
    const scale = builders[i] === "addCityHouse" ? 0.98 : 1.02;
    const house = context[builders[i]](root, 5, 8, scale, 0);
    const door = house.children.find(mesh => mesh.kind === "box" && mesh.dimensions[2] <= 0.1
      && mesh.dimensions[0] >= 0.9 && mesh.dimensions[0] <= 1.1 && mesh.dimensions[1] >= 2.4);
    assert.ok(door, `${builders[i]} has an adult-sized door`);
    assert.ok(door.dimensions[1] * scale > 2.3, `${builders[i]} door clears hero`);
    const shell = house.children.find(child => !child.kind && child.children.length === 6
      && child.children.every(mesh => mesh.kind === "box"));
    assert.ok(shell, `${builders[i]} has a closed shell`);
    const frontLeft = shell.children[2];
    close(Math.abs(frontLeft.position.x) - frontLeft.dimensions[0] / 2, door.dimensions[0] / 2, "side walls touch door edges");
    const header = shell.children[5];
    assert.ok(header.position.y - header.dimensions[1] / 2 <= door.position.y + door.dimensions[1] / 2 + 1e-9,
      `${builders[i]} header meets door top`);
    close(colliders.at(-1)[2], expectedRadii[i] * scale, "collision footprint preserved");
  }
});

test("meadow side window faces outward and porch slopes down onto its support", () => {
  const root = new Group();
  const house = context.addMeadowHouse(root, 0, 0, 1, 0);
  const window = house.children.find(child => !child.kind && child.position.x > 2 && child.children.length === 10);
  assert.ok(window);
  // Its local -Z face must become world +X on the right-hand wall.
  assert.ok(-Math.sin(window.rotation.y) > 0.99);
  const awning = house.children.find(mesh => mesh.kind === "box" && mesh.dimensions[0] === 1.92);
  assert.ok(awning.rotation.x < 0, "front edge descends toward porch posts");
  const frontY = awning.position.y - Math.tan(awning.rotation.x) * (-3.04 - awning.position.z);
  const beam = house.children.find(mesh => mesh.kind === "box" && mesh.dimensions[0] === 1.86);
  assert.ok(frontY - awning.dimensions[1] / (2 * Math.cos(awning.rotation.x)) <= beam.position.y + beam.dimensions[1] / 2 + 0.025);
});

test("desert roof rests directly on the wall course", () => {
  const house = context.addDesertHouse(new Group(), 0, 0, 1, 0);
  const roof = house.children.find(mesh => mesh.kind === "box" && mesh.dimensions[0] === 5.55);
  const shell = house.children.find(child => !child.kind && child.children.length === 6);
  const wall = shell.children[0];
  close(roof.position.y - roof.dimensions[1] / 2, wall.position.y + wall.dimensions[1] / 2, "flat roof contacts walls");
});


test("meadow flower boxes sit directly under their windows and against the wall", () => {
  const house = context.addMeadowHouse(new Group(), 0, 0, 1, 0);
  const planters = house.children.filter(child => !child.kind && child.children.length === 6
    && child.children[0]?.dimensions[0] === 0.78);
  assert.equal(planters.length, 2);
  for (const planter of planters) {
    const window = house.children.find(child => !child.kind && child.children.length === 10
      && child.position.x === planter.position.x);
    assert.ok(window);
    const foliageTop = planter.position.y + planter.children[1].position.y + planter.children[1].dimensions[1] / 2;
    const windowSillBottom = window.position.y - 0.32 - 0.04;
    close(foliageTop, windowSillBottom, "planter fits below sill");
    assert.ok(planter.position.z + planter.children[0].dimensions[2] / 2 >= window.position.z - 0.08,
      "box attaches to facade rather than floating forward");
  }
});


function transformedBoxPoint(object, point) {
  let { x, y, z } = point;
  for (const axis of ["z", "y", "x"]) {
    const angle = object.rotation[axis], c = Math.cos(angle), s = Math.sin(angle);
    if (axis === "z") [x, y] = [x * c - y * s, x * s + y * c];
    if (axis === "y") [x, z] = [x * c + z * s, z * c - x * s];
    if (axis === "x") [y, z] = [y * c - z * s, y * s + z * c];
  }
  return { x: x + object.position.x, y: y + object.position.y, z: z + object.position.z };
}
function boxCorners(object, parent = null) {
  const [width, height, depth] = object.dimensions, points = [];
  for (const x of [-width / 2, width / 2]) for (const y of [-height / 2, height / 2]) for (const z of [-depth / 2, depth / 2]) {
    const point = transformedBoxPoint(object, { x, y, z });
    points.push(parent ? transformedBoxPoint(parent, point) : point);
  }
  return points;
}
function insideFrame(point, frame) {
  return ["x", "y", "z"].every((axis, index) => Math.abs(point[axis] - frame.position[axis]) <= frame.dimensions[index] / 2 + 1e-9);
}

test("meadow corner braces join posts/top plates and clear front and side windows including shutters", () => {
  for (const variant of [0, 1]) {
    const house = context.addMeadowHouse(new Group(), 0, 0, 1, variant);
    const braces = house.children.filter(part => part.kind === "box" && part.material === materials.wood
      && part.dimensions[0] === .14 && (part.rotation.x !== 0 || part.rotation.z !== 0));
    const posts = house.children.filter(part => part.kind === "box" && part.dimensions[1] === 2.72);
    const plates = house.children.filter(part => part.kind === "box" && part.dimensions[1] === .18
      && (part.dimensions[0] === 5.34 || part.dimensions[2] === 4.7));
    const windows = house.children.filter(part => !part.kind && part.children.length === 10);
    assert.equal(braces.length, 6); assert.equal(posts.length, 4); assert.equal(plates.length, 4); assert.equal(windows.length, 3);
    for (const brace of braces) {
      const lower = transformedBoxPoint(brace, { x: 0, y: -brace.dimensions[1] / 2, z: 0 });
      const upper = transformedBoxPoint(brace, { x: 0, y: brace.dimensions[1] / 2, z: 0 });
      assert.ok(posts.some(post => insideFrame(lower, post)), "lower brace end joins a corner post");
      assert.ok(plates.some(plate => insideFrame(upper, plate)), "upper brace end joins a top plate");
      const braceBottom = Math.min(...boxCorners(brace).map(point => point.y));
      for (const window of windows) {
        const windowTop = Math.max(...window.children.flatMap(child => boxCorners(child, window)).map(point => point.y));
        assert.ok(braceBottom - windowTop > .2, "brace clears complete window frame and open shutters");
      }
    }
  }
});
