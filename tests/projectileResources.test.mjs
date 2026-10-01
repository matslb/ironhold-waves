import test from "node:test";
import assert from "node:assert/strict";
import { disposeProjectileResources } from "../src/systems/projectileResources.js";

function resource() {
  return { disposeCount: 0, dispose() { this.disposeCount += 1; } };
}

test("removed projectiles release their private geometry and material exactly once", () => {
  const geometries = [resource(), resource(), resource(), resource()];
  const materials = [resource(), resource(), resource(), resource()];
  const projectile = { ownedGeometries: [...geometries], ownedMaterials: [...materials] };
  assert.equal(disposeProjectileResources(projectile), true);
  assert.equal(disposeProjectileResources(projectile), false);
  for (const owned of [...geometries, ...materials]) assert.equal(owned.disposeCount, 1);
  assert.deepEqual(projectile.ownedGeometries, []);
  assert.deepEqual(projectile.ownedMaterials, []);
});

test("arrow cleanup leaves shared primitive geometry and game-wide materials alive", () => {
  const cachedGeometry = resource();
  const sharedShaftMaterial = resource();
  const privateHeadMaterial = resource();
  const privateFlameMaterial = resource();
  const projectile = {
    group: { children: [{ geometry: cachedGeometry, material: sharedShaftMaterial }, { geometry: cachedGeometry, material: privateHeadMaterial }] },
    ownedGeometries: [],
    ownedMaterials: [privateHeadMaterial, privateFlameMaterial]
  };
  disposeProjectileResources(projectile);
  assert.equal(cachedGeometry.disposeCount, 0);
  assert.equal(sharedShaftMaterial.disposeCount, 0);
  assert.equal(privateHeadMaterial.disposeCount, 1);
  assert.equal(privateFlameMaterial.disposeCount, 1);
});

test("clear paths safely accept absent projectiles and projectiles without private resources", () => {
  assert.equal(disposeProjectileResources(null), false);
  assert.equal(disposeProjectileResources(undefined), false);
  const projectile = {};
  assert.equal(disposeProjectileResources(projectile), true);
  assert.equal(disposeProjectileResources(projectile), false);
});
