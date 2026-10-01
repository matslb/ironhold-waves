import test from "node:test";
import assert from "node:assert/strict";
import { buildStaticWorldBatches } from "../src/systems/staticWorldBatch.js";

// The game loads Three from a CDN, so ordinary offline tests use a deliberately
// small scene/geometry double. Set STATIC_BATCH_THREE_MODULE to a downloaded
// three.module.js file to run these same ownership/hierarchy tests in Three.
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  fromArray(array) { return this.set(...array); }
  applyMatrix4(matrix) { this.x += matrix.x; this.y += matrix.y; this.z += matrix.z; return this; }
  applyMatrix3() { return this; }
  normalize() { const length = Math.hypot(this.x, this.y, this.z) || 1; return this.set(this.x / length, this.y / length, this.z / length); }
  transformDirection() { return this.normalize(); }
}
class Matrix4 {
  constructor() { this.x = this.y = this.z = 0; this.sign = 1; }
  copy(matrix) { Object.assign(this, matrix); return this; }
  invert() { this.x *= -1; this.y *= -1; this.z *= -1; return this; }
  multiplyMatrices(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; this.sign = a.sign * b.sign; return this; }
  determinant() { return this.sign; }
}
class Matrix3 { getNormalMatrix() { return this; } }
class Object3D {
  constructor() {
    this.isObject3D = true;
    this.children = []; this.parent = null; this.position = new Vector3();
    this.scale = new Vector3(1, 1, 1); this.matrixWorld = new Matrix4();
    this.visible = true; this.renderOrder = 0; this.matrixAutoUpdate = true;
    this.layers = { mask: 1 }; this.userData = {};
  }
  add(...objects) { for (const object of objects) { object.removeFromParent(); this.children.push(object); object.parent = this; } return this; }
  remove(object) { this.children.splice(this.children.indexOf(object), 1); object.parent = null; return this; }
  removeFromParent() { this.parent?.remove(this); return this; }
  traverse(visitor) { visitor(this); for (const child of this.children) child.traverse(visitor); }
  updateWorldMatrix(updateParents, updateChildren) {
    if (updateParents) this.parent?.updateWorldMatrix(true, false);
    this.matrixWorld.x = (this.parent?.matrixWorld.x || 0) + this.position.x;
    this.matrixWorld.y = (this.parent?.matrixWorld.y || 0) + this.position.y;
    this.matrixWorld.z = (this.parent?.matrixWorld.z || 0) + this.position.z;
    this.matrixWorld.sign = this.scale.x * this.scale.y * this.scale.z < 0 ? -1 : 1;
    if (updateChildren) for (const child of this.children) child.updateWorldMatrix(false, true);
  }
}
class Group extends Object3D { constructor() { super(); this.isGroup = true; } }
class Material { constructor() { this.opacity = 1; this.visible = true; } onBeforeCompile() {} customProgramCacheKey() {} }
class Mesh extends Object3D {
  constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; this.isMesh = true; this.castShadow = false; this.receiveShadow = false; this.frustumCulled = true; }
}
class BufferAttribute {
  constructor(array, itemSize, normalized = false) { Object.assign(this, { array, itemSize, normalized, count: array.length / itemSize }); }
  getX(index) { return this.array[index * this.itemSize]; }
  getY(index) { return this.array[index * this.itemSize + 1]; }
  getZ(index) { return this.array[index * this.itemSize + 2]; }
  getW(index) { return this.array[index * this.itemSize + 3]; }
  setXYZ(index, x, y, z) { this.array.set([x, y, z], index * this.itemSize); return this; }
  setW(index, w) { this.array[index * this.itemSize + 3] = w; return this; }
}
class BufferGeometry {
  constructor() { this.isBufferGeometry = true; this.attributes = {}; this.morphAttributes = {}; this.drawRange = { start: 0, count: Infinity }; this.index = null; }
  setAttribute(name, attribute) { this.attributes[name] = attribute; return this; }
  setIndex(index) { this.index = index; return this; }
  setDrawRange(start, count) { this.drawRange = { start, count }; }
  computeBoundingBox() { this.boundingBox = {}; }
  computeBoundingSphere() { this.boundingSphere = {}; }
  dispose() { this.disposed = true; }
}
const THREE = process.env.STATIC_BATCH_THREE_MODULE
  ? await import(process.env.STATIC_BATCH_THREE_MODULE)
  : { Vector3, Matrix4, Matrix3, Object3D, Group, Material, Mesh, BufferAttribute, BufferGeometry };
function material() { return THREE.MeshStandardMaterial ? new THREE.MeshStandardMaterial() : new THREE.Material(); }
function triangle({ indexed = true, color = false } = {}) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1]), 2));
  if (indexed) geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2]), 1));
  if (color) geometry.setAttribute("color", new THREE.BufferAttribute(new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]), 3, true));
  return geometry;
}
function batchMeshes(result) {
  const meshes = [];
  result.group.traverse(object => { if (object.isMesh) meshes.push(object); });
  return meshes;
}

test("merging bakes parent/root translations and preserves indexed art, UVs, color, material and flags", () => {
  const root = new THREE.Group(); root.position.set(100, 7, 200);
  const parent = new THREE.Group(); parent.position.set(2, 3, 4); parent.renderOrder = 4;
  root.add(parent);
  const geometry = triangle({ color: true });
  const originalPositions = [...geometry.attributes.position.array];
  const originalBounds = geometry.boundingBox;
  const paint = material();
  let sourceDisposals = 0;
  geometry.dispose = () => { sourceDisposals++; };
  paint.dispose = () => { sourceDisposals++; };
  const first = new THREE.Mesh(geometry, paint); const second = new THREE.Mesh(geometry, paint);
  first.position.x = 3; second.position.x = 5;
  for (const mesh of [first, second]) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.renderOrder = 2; mesh.layers.mask = 5; }
  parent.add(first, second);
  const result = buildStaticWorldBatches({ THREE, root });
  const [merged] = batchMeshes(result);
  assert.equal(result.stats.batches, 1); assert.equal(result.stats.drawCallsSaved, 1);
  assert.deepEqual([...merged.geometry.attributes.position.array], [5, 3, 4, 6, 3, 4, 5, 4, 4, 7, 3, 4, 8, 3, 4, 7, 4, 4]);
  assert.deepEqual([...merged.geometry.index.array], [0, 1, 2, 3, 4, 5]);
  assert.deepEqual([...merged.geometry.attributes.uv.array], [...geometry.attributes.uv.array, ...geometry.attributes.uv.array]);
  assert.equal(merged.geometry.attributes.color.normalized, true);
  assert.ok(merged.geometry.attributes.color.array instanceof Uint8Array);
  assert.deepEqual([...merged.geometry.attributes.color.array], [...geometry.attributes.color.array, ...geometry.attributes.color.array]);
  assert.deepEqual([...geometry.attributes.position.array], originalPositions);
  assert.equal(geometry.boundingBox, originalBounds);
  assert.equal(merged.material, paint); assert.equal(merged.castShadow, true); assert.equal(merged.receiveShadow, true);
  assert.equal(merged.renderOrder, 2); assert.equal(merged.parent.renderOrder, 4); assert.equal(merged.layers.mask, 5);
  assert.equal(first.geometry, geometry); assert.equal(first.position.x, 3);
  assert.equal(parent.parent, null);
  let disposedCount = 0;
  const originalDispose = merged.geometry.dispose.bind(merged.geometry);
  merged.geometry.dispose = () => { disposedCount++; originalDispose(); };
  result.dispose(); result.dispose();
  assert.equal(disposedCount, 1);
  assert.deepEqual(root.children, [parent]); assert.deepEqual(parent.children, [first, second]);
  assert.equal(first.parent, parent); assert.equal(first.matrixAutoUpdate, true);
  assert.equal(result.group.parent, null); assert.equal(sourceDisposals, 0);
});

test("excluded descendants, their ancestors and singletons stay live and retain sibling order on restore", () => {
  const root = new THREE.Group(); const parent = new THREE.Group(); root.add(parent);
  const paint = material(); const geometry = triangle();
  const first = new THREE.Mesh(geometry, paint); const second = new THREE.Mesh(geometry, paint);
  const live = new THREE.Group(); const liveMesh = new THREE.Mesh(geometry, paint); live.add(liveMesh);
  const distant = new THREE.Mesh(geometry, paint); distant.position.x = 100;
  parent.add(first, live, second, distant);
  const result = buildStaticWorldBatches({ THREE, root, excludeRoots: [live] });
  assert.equal(result.stats.batchedMeshes, 2); assert.equal(result.stats.skippedByReason.excluded, 1);
  assert.equal(liveMesh.parent, live); assert.equal(live.matrixAutoUpdate, true); assert.equal(parent.matrixAutoUpdate, true);
  assert.equal(parent.parent, root); assert.equal(distant.parent, parent); assert.equal(distant.matrixAutoUpdate, false);
  result.dispose();
  assert.deepEqual(parent.children, [first, live, second, distant]); assert.equal(distant.matrixAutoUpdate, true);
});

test("transparent, mirrored, callback, shader, morph and child-bearing meshes remain untouched", () => {
  const root = new THREE.Group(); const geometry = triangle(); const paint = material();
  const transparent = new THREE.Mesh(geometry, material()); transparent.material.transparent = true;
  const mirrored = new THREE.Mesh(geometry, paint); mirrored.scale.x = -1;
  const custom = new THREE.Mesh(geometry, paint); custom.onBeforeRender = () => {};
  const shader = new THREE.Mesh(geometry, material()); shader.material.isShaderMaterial = true;
  const childBearing = new THREE.Mesh(geometry, paint); childBearing.add(new THREE.Group());
  const morph = new THREE.Mesh(triangle(), paint); morph.geometry.morphAttributes.position = [geometry.attributes.position];
  const first = new THREE.Mesh(geometry, paint); const second = new THREE.Mesh(geometry, paint);
  root.add(transparent, mirrored, custom, shader, childBearing, morph, first, second);
  const result = buildStaticWorldBatches({ THREE, root });
  assert.equal(result.stats.batchedMeshes, 2);
  for (const mesh of [transparent, mirrored, custom, shader, childBearing, morph]) {
    assert.equal(mesh.parent, root); assert.equal(mesh.visible, true); assert.equal(mesh.matrixAutoUpdate, true);
  }
  assert.equal(result.stats.skippedByReason.reflectedTransform, 1);
  assert.equal(result.stats.skippedByReason.transparent, 1);
  result.dispose();
});

test("non-indexed art respects partial draw ranges and spatial/material/shadow partitions", () => {
  const root = new THREE.Group(); const paint = material();
  const geometry = triangle({ indexed: false });
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array([...attribute.array, ...attribute.array]), attribute.itemSize));
  }
  geometry.setDrawRange(3, 3);
  const first = new THREE.Mesh(geometry, paint); const second = new THREE.Mesh(geometry, paint);
  const far = new THREE.Mesh(geometry, paint); far.position.x = -100;
  const alternate = new THREE.Mesh(geometry, material());
  const shadow = new THREE.Mesh(geometry, paint); shadow.castShadow = true;
  root.add(first, second, far, alternate, shadow);
  const result = buildStaticWorldBatches({ THREE, root, cellSize: 16 });
  assert.equal(result.stats.batches, 1); assert.equal(result.stats.batchedMeshes, 2);
  assert.deepEqual([...batchMeshes(result)[0].geometry.index.array], [3, 4, 5, 9, 10, 11]);
  assert.equal(far.parent, root); assert.equal(alternate.parent, root); assert.equal(shadow.parent, root);
  result.dispose();
});

test("large collections split into buffers that fit sixteen-bit indices", () => {
  const root = new THREE.Group(); const paint = material(); const geometry = triangle();
  for (let index = 0; index < 22000; index++) root.add(new THREE.Mesh(geometry, paint));
  const result = buildStaticWorldBatches({ THREE, root });
  assert.equal(result.stats.batches, 2); assert.equal(result.stats.batchedMeshes, 22000);
  assert.equal(result.stats.indices, 66000);
  for (const mesh of batchMeshes(result)) {
    assert.ok(mesh.geometry.attributes.position.count <= 65535);
    assert.ok(mesh.geometry.index.array instanceof Uint16Array);
  }
  result.dispose();
  assert.equal(root.children.length, 22000);
});
